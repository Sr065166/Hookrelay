import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/config/database';
import { createTestUserAndOrg } from './helpers';
import { processDeliveries } from '../src/worker';
import http from 'http';
import crypto from 'crypto';

describe('Worker Tests', () => {
  let server: http.Server;
  let receivedRequests: { headers: any, body: string }[] = [];
  let serverStatus = 500;
  let serverPort = 0;

  beforeEach(async () => {
    await prisma.delivery.deleteMany();
    serverStatus = 500;
    receivedRequests = [];
  });

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        receivedRequests.push({ headers: req.headers, body });
        res.writeHead(serverStatus);
        res.end('response');
      });
    });
    
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        serverPort = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('HMAC signature verification and successful delivery', async () => {
    const { org } = await createTestUserAndOrg();
    serverStatus = 200;
    receivedRequests = [];

    const secret = 'my-secret';
    const ep = await prisma.endpoint.create({
      data: {
        organizationId: org.id,
        url: `http://127.0.0.1:${serverPort}/test1`,
        eventsSubscribed: ['*'],
        secret,
      }
    });

    const payload = { test: 123 };
    const event = await prisma.event.create({
      data: {
        organizationId: org.id,
        eventType: 'test',
        payload,
      }
    });

    const delivery = await prisma.delivery.create({
      data: {
        eventId: event.id,
        endpointId: ep.id,
        status: 'PENDING',
      }
    });

    await processDeliveries();

    expect(receivedRequests.length).toBe(1);
    const req = receivedRequests[0];
    
    // Check HMAC
    const expectedSig = crypto.createHmac('sha256', secret)
      .update(`${req.headers['hookrelay-timestamp']}.${JSON.stringify(payload)}`)
      .digest('hex');
    expect(req.headers['hookrelay-signature']).toBe(`${expectedSig}`);

    // Check delivery status
    const updated = await prisma.delivery.findUnique({ where: { id: delivery.id } });
    expect(updated?.status).toBe('DELIVERED');
  });

  it('retry/backoff and MAX_ATTEMPTS=10 & failed endpoint handling', async () => {
    const { org } = await createTestUserAndOrg();
    serverStatus = 500;
    receivedRequests = [];

    const ep = await prisma.endpoint.create({
      data: {
        organizationId: org.id,
        url: `http://127.0.0.1:${serverPort}/test2`,
        eventsSubscribed: ['*'],
        secret: 'sec',
      }
    });

    const event = await prisma.event.create({
      data: {
        organizationId: org.id,
        eventType: 'test',
        payload: {},
      }
    });

    const delivery = await prisma.delivery.create({
      data: {
        eventId: event.id,
        endpointId: ep.id,
        status: 'PENDING',
      }
    });

    // Run worker 10 times to simulate 10 failures
    for (let i = 1; i <= 10; i++) {
      // Force nextRetryAt to past so worker picks it up
      await prisma.delivery.update({
        where: { id: delivery.id },
        data: { nextRetryAt: new Date(Date.now() - 10000) }
      });
      await processDeliveries();

      const d = await prisma.delivery.findUnique({ where: { id: delivery.id } });
      expect(d?.attemptsCount).toBe(i);
      
      if (i < 10) {
        expect(d?.status).toBe('FAILED');
        expect(d?.nextRetryAt).not.toBeNull();
      } else {
        expect(d?.status).toBe('FAILED');
        expect(d?.nextRetryAt).toBeNull(); // Exhausted
      }
    }

    // Endpoint should be disabled after 10 consecutive failures
    const updatedEp = await prisma.endpoint.findUnique({ where: { id: ep.id } });
    expect(updatedEp?.status).toBe('DISABLED');
  });

  it('concurrent workers do not double-claim a delivery', async () => {
    const { org } = await createTestUserAndOrg();
    serverStatus = 200;

    const ep = await prisma.endpoint.create({
      data: {
        organizationId: org.id,
        url: `http://127.0.0.1:${serverPort}/test3`,
        eventsSubscribed: ['*'],
        secret: 'sec',
      }
    });

    const event = await prisma.event.create({
      data: {
        organizationId: org.id,
        eventType: 'test',
        payload: {},
      }
    });

    await prisma.delivery.create({
      data: {
        eventId: event.id,
        endpointId: ep.id,
        status: 'PENDING',
      }
    });

    // Run multiple workers concurrently
    await Promise.all([
      processDeliveries(),
      processDeliveries(),
      processDeliveries(),
      processDeliveries(),
    ]);

    // Should only have 1 delivery attempt
    const attempts = await prisma.deliveryAttempt.count({
      where: { delivery: { endpointId: ep.id } }
    });
    expect(attempts).toBe(1);
  });
});
