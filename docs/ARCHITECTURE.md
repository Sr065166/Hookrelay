# HookRelay System Architecture

HookRelay is a multi-tenant webhook delivery and ingestion platform designed to reliably receive, buffer, sign, and deliver webhooks to registered consumer endpoints with configurable retries, rate limiting, and full observability.

---

## 1. High-Level Component Architecture

```
                          ┌───────────────────────┐
                          │   Frontend Web App    │
                          │ (React + Vite + TW)   │
                          └──────────┬────────────┘
                                     │ HTTP / REST
                                     ▼
┌──────────────────┐      ┌───────────────────────┐
│ Producer Systems │─────▶│    Ingestion & Mgmt   │
│  (API Events)    │ API  │      Server (Node/    │
└──────────────────┘ Key  │   Express/TypeScript) │
                          └──────────┬────────────┘
                                     │
                                     │ Prisma ORM
                                     ▼
                          ┌───────────────────────┐
                          │ PostgreSQL Datastore  │
                          │ (State & Audit Log)   │
                          └──────────┬────────────┘
                                     │
                                     │ Event Fetch / Lock
                                     ▼
                          ┌───────────────────────┐
                          │  Webhook Dispatcher   │
                          │   Worker Service      │
                          └──────────┬────────────┘
                                     │
                    Signed HTTPS POST │ (HMAC-SHA256)
                                     ▼
                          ┌───────────────────────┐
                          │  Customer Endpoints   │
                          │  (Destination URLs)   │
                          └───────────────────────┘
```

### Core Components

1. **Ingestion & Management API (`/server`)**
   - **Ingestion**: Accepts incoming event payloads from producers via authenticated endpoints (`POST /api/v1/events`) using organization API keys. Validates payload structure, checks rate limits, and enqueues events.
   - **Management API**: Exposes tenant administration for organizations, team memberships, webhook endpoints, subscriptions, API keys, and delivery logs.
   - **Health & Monitoring**: Exposes `/health` and telemetry endpoints for container orchestration and uptime probes.

2. **Webhook Delivery Worker (`/server/src/worker`)**
   - Polls or consumes pending delivery tasks.
   - Signs requests using per-endpoint HMAC secrets.
   - Dispatches outgoing HTTP POST requests with configurable timeouts.
   - Records delivery attempts, response status codes, latencies, and response bodies for debugging.
   - Schedules retries using exponential backoff with jitter on transient failures (5xx, timeouts, network errors).

3. **PostgreSQL Datastore**
   - Relational store for multi-tenant metadata (Organizations, Users, Endpoints).
   - Event audit store and delivery lifecycle ledger (`Event`, `Delivery`, `DeliveryAttempt`).
   - Managed via Prisma ORM for type-safe queries and automated migrations.

4. **Web Dashboard (`/web`)**
   - Single-Page Application (React, Vite, Tailwind CSS).
   - Allows users to authenticate, switch organizations, inspect event logs, register and test endpoints, rotate secrets, and view delivery metrics.

---

## 2. Multi-Tenancy & Roles (RBAC)

HookRelay enforces strict multi-tenant data isolation. Every operational resource (endpoints, API keys, events, deliveries) belongs to exactly one **Organization**. Users can belong to multiple organizations with distinct roles defined via `Membership`.

| Role          | Permissions & Capabilities                                                                                                                                                                                  |
| :------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**     | Full organization administrative access. Can delete organization, transfer ownership, manage billing, delete team members, promote/demote roles, manage API keys and endpoints.                             |
| **Admin**     | Can manage team members (invite, update roles up to Admin), create and revoke API keys, create/edit/delete endpoints, and view all event and delivery logs. Cannot delete the organization.                 |
| **Developer** | Can create, update, and test webhook endpoints, generate and rotate API keys, send test events, view payload contents, inspect delivery logs, and trigger manual retries. Cannot manage members or billing. |
| **Viewer**    | Read-only access. Can inspect endpoints, view delivery statuses, latency charts, and event counts. Cannot view raw secret keys, cannot modify configurations, and cannot trigger retries.                   |

---

## 3. Planned Data Model (Phase 2+)

The relational schema will be implemented with Prisma in Phase 2. The core entities and their relationships are structured as follows:

### Entity Relationship Outline

```
  +------------------+         +------------------+
  |       User       |         |   Organization   |
  +--------+---------+         +--------+---------+
           | 1                          | 1
           |                            |
           |        +------------+      |
           +------->| Membership |<-----+
                  * +------------+ *
                           |
                           | (Role: Owner, Admin, Developer, Viewer)

  +------------------+         +------------------+
  |   Organization   |1       *|      ApiKey      |
  +--------+---------+---------+------------------+
           | 1
           |
           +------------------* +------------------+
           |                   |     Endpoint     |
           |                   +--------+---------+
           | 1                          | 1
           |                            |
           +------------------*         |
           |      Event       |1        |
           +--------+---------+         |
                    | 1                 |
                    |                   |
                    |   +----------+    |
                    +-->| Delivery |<---+ *
                      * +----+-----+
                             | 1
                             |
                             | *
                      +------+----------+
                      | DeliveryAttempt |
                      +-----------------+
```

### Key Entities

1. **User**
   - `id`: UUID (Primary Key)
   - `email`: String (Unique)
   - `name`: String?
   - `passwordHash`: String?
   - `createdAt`, `updatedAt`: Timestamps

2. **Organization**
   - `id`: UUID (Primary Key)
   - `name`: String
   - `slug`: String (Unique)
   - `createdAt`, `updatedAt`: Timestamps

3. **Membership**
   - `id`: UUID (Primary Key)
   - `userId`: UUID (FK -> User)
   - `organizationId`: UUID (FK -> Organization)
   - `role`: Enum (`OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`)
   - Unique constraint: `[userId, organizationId]`

4. **ApiKey**
   - `id`: UUID (Primary Key)
   - `organizationId`: UUID (FK -> Organization)
   - `name`: String
   - `keyHash`: String (SHA-256 hash of secret token)
   - `keyPrefix`: String (e.g. `hr_live_...`)
   - `lastUsedAt`: Timestamp?
   - `revokedAt`: Timestamp?
   - `createdAt`: Timestamp

5. **Endpoint**
   - `id`: UUID (Primary Key)
   - `organizationId`: UUID (FK -> Organization)
   - `url`: String (Destination target URL)
   - `description`: String?
   - `secret`: String (Per-endpoint HMAC signing secret)
   - `status`: Enum (`ACTIVE`, `DISABLED`, `FAILING`)
   - `eventsSubscribed`: String[] (Filter by event type, e.g. `["order.created", "*"]`)
   - `timeoutMs`: Integer (Default 10000ms)
   - `createdAt`, `updatedAt`: Timestamps

6. **Event**
   - `id`: UUID (Primary Key)
   - `organizationId`: UUID (FK -> Organization)
   - `eventType`: String (e.g. `invoice.paid`)
   - `payload`: JSONB (Event payload data)
   - `idempotencyKey`: String? (Per-org deduplication key)
   - `createdAt`: Timestamp

7. **Delivery**
   - `id`: UUID (Primary Key)
   - `eventId`: UUID (FK -> Event)
   - `endpointId`: UUID (FK -> Endpoint)
   - `status`: Enum (`PENDING`, `DELIVERING`, `DELIVERED`, `FAILED`)
   - `nextRetryAt`: Timestamp?
   - `attemptsCount`: Integer (Default 0)
   - `createdAt`, `updatedAt`: Timestamps

8. **DeliveryAttempt**
   - `id`: UUID (Primary Key)
   - `deliveryId`: UUID (FK -> Delivery)
   - `attemptNumber`: Integer
   - `statusCode`: Integer? (HTTP response status)
   - `responseBody`: Text? (Truncated response body for debugging)
   - `responseTimeMs`: Integer? (Elapsed time)
   - `error`: Text? (Network error message if connection failed)
   - `createdAt`: Timestamp

---

## 4. Webhook Security & Signatures

To ensure endpoint consumers can verify request authenticity and prevent replay attacks:

1. **Signature Header**: Every dispatched webhook request includes:
   - `X-HookRelay-Signature`: `t={timestamp},v1={hmac_sha256}`
   - `X-HookRelay-Event-Id`: Unique event identifier
   - `X-HookRelay-Delivery-Id`: Unique delivery identifier
2. **Signature Computation**:
   - The signature payload is formed by concatenating the timestamp, a dot, and the raw JSON request body:
     ```
     signed_payload = timestamp + "." + raw_body
     signature = HMAC_SHA256(secret, signed_payload).hex()
     ```
3. **Replay Defense**: Consumers compare `t` against the current server time and reject requests older than a configured tolerance window (e.g., 5 minutes).

---

## 5. Retry Policy & Delivery Guarantees

HookRelay guarantees **at-least-once delivery** for active endpoints:

1. **Success Condition**: HTTP response code `2xx` within the endpoint timeout window.
2. **Transient Failures (Retryable)**:
   - HTTP `5xx` (Internal Server Error, Bad Gateway, Service Unavailable).
   - HTTP `429` (Too Many Requests / Rate Limited, honoring `Retry-After` if present).
   - Network timeouts, DNS resolution failures, connection resets.
3. **Non-Retryable Failures**:
   - HTTP `4xx` (except 429), indicating bad payload format or invalid URL.
4. **Backoff Schedule**:
   - Up to 10 attempts spaced with exponential backoff and randomized jitter:
     - Retry 1: ~1 minute
     - Retry 2: ~5 minutes
     - Retry 3: ~30 minutes
     - Retry 4: ~2 hours
     - Retry 5-9: Incremental backoff maxing out based on jitter
   - If all retries are exhausted, the delivery status is marked as `FAILED` and an alert is recorded.

## Deployment Configuration

The following environment variables must be configured in production:

- `PORT`: The port the server will bind to (e.g., 4000).
- `NODE_ENV`: Must be set to `production`.
- `DATABASE_URL`: Connection string to the production PostgreSQL database.
- `CLIENT_URL`: The URL of the production frontend (e.g., `https://web-sahil-s-projects22.vercel.app`). Required for CORS.
- `JWT_ACCESS_SECRET`: Secure, randomly generated secret (min 64 chars) for signing access tokens.
- `JWT_REFRESH_SECRET`: Secure, randomly generated secret (min 64 chars) for signing refresh tokens.
- `JWT_ACCESS_EXPIRES_IN`: Expiration duration for access tokens (e.g., `15m`).
- `JWT_REFRESH_EXPIRES_IN`: Expiration duration for refresh tokens (e.g., `7d`).

Note: The worker runs in the same process as the web server when `NODE_ENV !== 'test'`, which makes it compatible with Render's single Web Service architecture.

