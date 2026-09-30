import crypto from 'crypto';
import { prisma } from '../config/database';
import { DeliveryStatus, EndpointStatus } from '@prisma/client';

const BATCH_SIZE = 5;
const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 10;
const STALE_LOCK_MINUTES = 5;
const CONSECUTIVE_FAILURE_THRESHOLD = 10;

let workerInterval: NodeJS.Timeout | null = null;

export interface WorkerStatus {
  active: boolean;
  name: string;
}

export function getWorkerStatus(): WorkerStatus {
  return {
    active: workerInterval !== null,
    name: 'hookrelay-worker',
  };
}

export function startWorker() {
  if (workerInterval) return;
  console.log('Starting Delivery Worker...');
  workerInterval = setInterval(processDeliveries, POLL_INTERVAL_MS);
}

export function stopWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('Delivery Worker stopped.');
  }
}

export async function processDeliveries() {
  try {
    // Claim jobs atomically
    const deliveries: any[] = await prisma.$queryRawUnsafe(`
      UPDATE deliveries
      SET status = 'DELIVERING',
          locked_at = NOW(),
          updated_at = NOW()
      WHERE id IN (
        SELECT id FROM deliveries
        WHERE status IN ('PENDING', 'FAILED')
          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
          AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '${STALE_LOCK_MINUTES} minutes')
        ORDER BY next_retry_at ASC NULLS FIRST, created_at ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `);

    if (deliveries.length === 0) return;

    // Process each delivery concurrently
    await Promise.all(deliveries.map(deliverWebhook));
  } catch (error) {
    console.error('Worker error fetching deliveries:', error);
  }
}

async function deliverWebhook(deliveryRow: any) {
  // queryRaw returns camelCase or snake_case depending on DB map, but we mapped them via @map so DB has snake_case
  // We need to fetch full related models (Event, Endpoint) via Prisma to easily get fields
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryRow.id },
    include: {
      event: true,
      endpoint: true,
    },
  });

  if (!delivery || !delivery.endpoint || !delivery.event) return;

  const { endpoint, event } = delivery;

  // If endpoint is disabled, we mark delivery as FAILED permanently and do not attempt
  if (endpoint.status === 'DISABLED') {
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.FAILED,
        lockedAt: null,
      },
    });
    return;
  }

  const payloadStr = JSON.stringify(event.payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  
  // HMAC signature: Base64( HMAC-SHA256( secret, timestamp + "." + payload ) )
  // Alternatively standard hex string. The request says "HMAC-SHA256 signature". Let's use hex.
  const signaturePayload = `${timestamp}.${payloadStr}`;
  const signature = crypto
    .createHmac('sha256', endpoint.secret)
    .update(signaturePayload)
    .digest('hex');

  const startTime = Date.now();
  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let errorMsg: string | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), endpoint.timeoutMs || 10000);

    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'HookRelay-Timestamp': timestamp,
        'HookRelay-Signature': signature,
      },
      body: payloadStr,
      signal: controller.signal as any,
    });

    clearTimeout(timeoutId);
    statusCode = res.status;
    responseBody = await res.text();
    // Truncate response body to fit in DB sensibly (e.g. max 1000 chars)
    if (responseBody.length > 1000) {
      responseBody = responseBody.substring(0, 1000) + '...';
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      errorMsg = 'Request timeout';
    } else {
      errorMsg = err.message;
    }
  }

  const responseTimeMs = Date.now() - startTime;
  const isSuccess = statusCode !== null && statusCode >= 200 && statusCode < 300;
  
  // Create delivery attempt record
  await prisma.deliveryAttempt.create({
    data: {
      deliveryId: delivery.id,
      attemptNumber: delivery.attemptsCount + 1,
      statusCode,
      responseBody,
      responseTimeMs,
      error: errorMsg,
    },
  });

  const nextAttemptsCount = delivery.attemptsCount + 1;
  
  if (isSuccess) {
    // Success!
    await prisma.$transaction([
      prisma.delivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.DELIVERED,
          attemptsCount: nextAttemptsCount,
          lockedAt: null,
          nextRetryAt: null,
        },
      }),
      // Reset endpoint consecutive failures
      // But we don't track consecutive failures easily without a field on Endpoint?
      // Wait, the prompt says: "automatic endpoint disabling after the configured consecutive-failure threshold"
    ]);
  } else {
    // Failure
    const isExhausted = nextAttemptsCount >= MAX_ATTEMPTS;
    
    // Exponential backoff with jitter
    let nextRetryAt = null;
    if (!isExhausted) {
      const baseDelay = Math.pow(2, nextAttemptsCount) * 1000; // 2s, 4s, 8s, 16s...
      const jitter = Math.random() * 1000;
      nextRetryAt = new Date(Date.now() + baseDelay + jitter);
    }

    await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.FAILED,
        attemptsCount: nextAttemptsCount,
        lockedAt: null,
        nextRetryAt,
      },
    });

    // Check consecutive failure threshold for disabling endpoint
    await checkEndpointThreshold(endpoint.id);
  }
}

async function checkEndpointThreshold(endpointId: string) {
  // Check the last CONSECUTIVE_FAILURE_THRESHOLD deliveries for this endpoint
  // A simple way is to count recent delivery attempts across all deliveries for this endpoint
  // But a strict consecutive failure means NO successes in the last N attempts.
  const recentAttempts = await prisma.deliveryAttempt.findMany({
    where: { delivery: { endpointId } },
    orderBy: { createdAt: 'desc' },
    take: CONSECUTIVE_FAILURE_THRESHOLD,
    select: { statusCode: true, error: true },
  });

  if (recentAttempts.length === CONSECUTIVE_FAILURE_THRESHOLD) {
    const allFailed = recentAttempts.every(a => !a.statusCode || a.statusCode < 200 || a.statusCode >= 300);
    if (allFailed) {
      await prisma.endpoint.update({
        where: { id: endpointId },
        data: { status: EndpointStatus.DISABLED },
      });
    }
  }
}
