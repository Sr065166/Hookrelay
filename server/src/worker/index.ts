/**
 * HookRelay Webhook Delivery Worker
 *
 * This worker module will handle background delivery of webhooks:
 * - Polling/subscribing to queued delivery attempts
 * - Signing payload with HMAC-SHA256
 * - Dispatching HTTP requests with timeouts and exponential retry backoff
 *
 * Full worker lifecycle implementation belongs to Phase 4.
 */

export interface WorkerStatus {
  active: boolean;
  name: string;
}

export function getWorkerStatus(): WorkerStatus {
  return {
    active: false,
    name: 'hookrelay-worker',
  };
}
