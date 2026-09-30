# HookRelay

HookRelay is a multi-tenant webhook dispatch and delivery platform designed for reliable at-least-once webhook delivery. It acts as an asynchronous middleware layer between your core application and your customers' webhook endpoints. It handles event ingestion, securely hashes API keys, reliably queues deliveries, and guarantees at-least-once delivery with exponential backoff and cryptographic signature verification.

## Production URLs

- **Frontend Application**: [https://web-sahil-s-projects22.vercel.app](https://web-sahil-s-projects22.vercel.app)
- **Backend API**: [https://hookrelay-backend.onrender.com](https://hookrelay-backend.onrender.com)

## Key Features

- **Multi-Tenant Architecture**: Strict logical separation of data across different organizations.
- **Role-Based Access Control (RBAC)**: Support for OWNER, ADMIN, DEVELOPER, and VIEWER roles.
- **Reliable Delivery Engine**: Asynchronous delivery worker with exponential backoff + jitter.
- **Cryptographic Security**: API-keys are hashed (SHA-256), and outgoing webhooks are signed using HMAC-SHA256.
- **Idempotency**: Prevent duplicate event processing using `Idempotency-Key` headers.
- **High Concurrency**: Row-level database locking (`FOR UPDATE SKIP LOCKED`) ensures safe concurrent processing across multiple worker instances.
- **Manual Replay**: Ability to manually replay failed webhook deliveries.

---

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, React Router
- **Database**: PostgreSQL (Supabase)
- **Testing**: Vitest, Supertest
- **CI/CD**: GitHub Actions, Vercel, Render

---

## Architecture Diagram

```mermaid
flowchart TD
    Client[Client Application]
    Customer[Customer Webhook Endpoint]
    
    subgraph HookRelay [HookRelay Platform]
        API[Express REST API]
        Worker[Asynchronous Delivery Worker]
        DB[(PostgreSQL)]
    end

    Client -- "POST /v1/events\n(X-Api-Key)" --> API
    API -- "Store Event & Deliveries" --> DB
    
    Worker -- "Poll Pending Deliveries\n(FOR UPDATE SKIP LOCKED)" --> DB
    Worker -- "POST Payload\n(HMAC-SHA256 Signed)" --> Customer
    
    Customer -- "2xx OK / 5xx Error" --> Worker
    Worker -- "Update Attempt/Status\n(Schedule Retry)" --> DB
```

---

## Local Setup & Environment Variables

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the `server` directory (see `server/.env.example`):
   ```ini
   PORT=4000
   NODE_ENV=development
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/hookrelay?schema=public"
   CLIENT_URL="http://localhost:5173"
   JWT_ACCESS_SECRET="your_min_64_char_access_secret"
   JWT_REFRESH_SECRET="your_min_64_char_refresh_secret"
   JWT_ACCESS_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"
   ```
   For the frontend, create `web/.env.local`:
   ```ini
   VITE_API_URL=http://localhost:4000/api/v1
   ```

3. **Database Setup**
   Run the Prisma migrations and seed the database:
   ```bash
   npm run db:setup --workspace=server
   ```

4. **Start the Application**
   ```bash
   npm start
   ```
   (Starts both backend and frontend via concurrently)

---

## Testing Instructions

The project uses `vitest` for fast, concurrent testing of both API routes and the worker process. Tests automatically connect to a dedicated testing database to ensure isolation.

```bash
# Run all tests (API, DB, Worker)
npm test --workspace=server

# Run tests with coverage
npm run test:coverage --workspace=server
```

---

## Engineering Decisions

1. **Multi-tenancy**: Achieved by scoping all primary entities (API Keys, Endpoints, Events, Deliveries) to an `organizationId`. Middleware enforces that users can only access data tied to organizations they are members of.
2. **RBAC**: Implemented via a `Membership` pivot table linking `User` and `Organization` with an enum role (`OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`). Middleware checks authorizations before fulfilling requests.
3. **API-key hashing**: Raw API keys are only shown once. We store a `keyPrefix` and a SHA-256 `keyHash` in the database to prevent secrets from leaking in the event of a database compromise.
4. **Idempotency**: Clients can pass an `Idempotency-Key` header during event ingestion. HookRelay uses a unique database constraint (`organizationId`, `idempotencyKey`) to safely ignore duplicates and return the existing event.
5. **FOR UPDATE SKIP LOCKED**: The worker process pulls pending deliveries using row-level locks. `SKIP LOCKED` ensures that if multiple worker instances run concurrently, they will instantly bypass rows locked by other workers, eliminating race conditions without distributed locks (like Redis).
6. **Asynchronous delivery worker**: Instead of a separate microservice, the worker runs via `setInterval` natively inside the Node.js process (when not in a test environment), minimizing infrastructure costs on Render while remaining completely horizontally scalable.
7. **HMAC-SHA256 signatures**: Every outgoing webhook request receives an `X-HookRelay-Signature` header (`t=...,v1=...`). Customers can verify that the payload was strictly sent by HookRelay and wasn't tampered with.
8. **Exponential backoff + jitter**: Failed deliveries are rescheduled. The backoff interval increases exponentially `(2^attempts * base_interval)`, and jitter is applied to prevent thundering herd problems on failing customer servers.
9. **MAX_ATTEMPTS=10**: A hard limit is enforced on retry attempts. Once a webhook fails 10 times, its status transitions to `FAILED` permanently unless manually replayed.
10. **Manual replay**: Users can manually trigger a replay of a `FAILED` delivery. This resets the attempt count, unlocks the row, and transitions it back to `PENDING` to be immediately picked up by the worker.
11. **Endpoint auto-disable**: Designed into the schema (endpoints have `status: ACTIVE | DISABLED | FAILING`). Repeated consecutive delivery failures trigger endpoint disabling after the configured threshold.
12. **CI/CD**: Fully automated GitHub Actions workflow checks formatting, linting, runs a Postgres service, generates the Prisma client, and executes the entire Vitest suite to prevent regressions.

---

## Webhook Delivery & Retry Explanation

When an event is ingested, HookRelay looks up all `ACTIVE` endpoints subscribed to that event type. It creates a `Delivery` record for each matching endpoint with a `PENDING` status. 
The background worker continually queries for `PENDING` or `DELIVERING` (ready for retry) deliveries. 
When a request fails (non-2xx response, timeout, or network error), HookRelay records a `DeliveryAttempt` with the failure reason and schedules a `nextRetryAt` timestamp using exponential backoff up to a strict limit of 10 maximum attempts. After 10 failures, it marks the delivery as `FAILED`.

---

## Deployment Architecture

- **PostgreSQL Database**: Hosted on Supabase. Render connects to Supabase via the IPv4 Supavisor connection pooler (`pooler.supabase.com` on port `6543`) to guarantee robust, connection-pooled performance.
- **Backend**: Hosted on Render as a Web Service. The Express API and asynchronous delivery worker run simultaneously.
- **Frontend**: Hosted on Vercel. Deploys are fully static and optimized for global edge delivery. It communicates with the Render API via dynamic environment configuration.

---

## Concise API Documentation

### Authentication (`/api/v1/auth`)
- `POST /register`: Register a new user and organization. Returns JWT tokens.
- `POST /login`: Authenticate existing user. Returns JWT tokens.
- `GET /me`: Get current user details and organization memberships.

### API Keys (`/api/v1/orgs/:orgId/api-keys`)
- `GET /`: List all API keys for the organization.
- `POST /`: Create a new API key (Returns the raw secret key exactly once).
- `DELETE /:id`: Revoke an API key.

### Endpoints (`/api/v1/orgs/:orgId/endpoints`)
- `GET /`: List endpoints.
- `POST /`: Create an endpoint (requires `url` and `events` subscription array).
- `GET /:id`: Retrieve endpoint details including the HMAC signing secret.
- `DELETE /:id`: Soft-delete/disable an endpoint.

### Event Ingestion (`/api/v1/events`)
- **Headers Needed**: `X-Api-Key: hr_...`
- `POST /`: Ingest a new event into the platform.
  ```json
  // Request
  {
    "eventType": "order.created",
    "payload": { "orderId": 123, "amount": 99.99 }
  }
  // Response (201 Created or 200 OK if Idempotent)
  {
    "idempotent": false,
    "event": { "id": "...", "eventType": "order.created" }
  }
  ```

### Events & Deliveries (`/api/v1/orgs/:orgId/...`)
- `GET /events`: List ingested events for the organization (supports pagination).
- `GET /deliveries`: List deliveries (filters: `endpointId`, `eventId`, `status`).
- `GET /deliveries/:id`: Get delivery details, including an array of `attempts`.
- `POST /deliveries/:id/replay`: Re-queue a `FAILED` delivery for immediate processing by the worker.
