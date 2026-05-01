# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TravelHub** is an Nx 22.5.1 monorepo with three applications sharing a single `node_modules/`:
- **services/** — 9 independent NestJS 11 microservices (see port map below)
- **frontend** — React 19 + Vite 7 SPA (port 4200, preview on 4300)
- **mobile** — Expo 54 + React Native 0.81 app (port 8081)

### Microservices Port Map

| Service | Port | Responsibility |
|---|---|---|
| `api-gateway` | 3000 | Routes frontend/mobile requests to downstream services; JWT validation; rate limiting |
| `auth-service` | 3001 | Registration, login, JWT issuance, MFA, RBAC, GDPR/LGPD |
| `search-service` | 3002 | Property search (city, dates, capacity, amenities, price); ranking; ≤800ms p95 |
| `inventory-service` | 3003 | PMS webhooks, room/rate/availability management, multi-currency, conflict resolution |
| `booking-service` | 3004 | Cart (15-min hold), reservation CRUD, fare calc, taxes, cancellations, audit trail |
| `payment-service` | 3005 | Multi-provider (Stripe/MercadoPago/PayPal), tokenization, fraud detection, reconciliation |
| `notification-service` | 3006 | Email, push notifications, alerts (async, called by other services) |
| `partners-service` | 3007 | Hotel/agency portal: dashboards, revenue reports, rate management |
| `integration-service` | 3008 | Single entry point for external partner data: PMS webhooks (generic + Hotelbeds/TravelClick/RoomRaccoon), CSV bulk import, external↔internal ID mapping |

## Commands

Always run tasks through `nx` commands, not underlying tools directly. Prefix with `pnpm exec nx` or use `nx` directly.

### Development
```bash
pnpm install                   # Install all dependencies
pnpm start                     # Start all apps concurrently
pnpm run serve:api-gateway     # API Gateway (port 3000)
pnpm run serve:auth            # Auth service (port 3001)
pnpm run serve:search          # Search service (port 3002)
pnpm run serve:inventory       # Inventory service (port 3003)
pnpm run serve:booking         # Booking service (port 3004)
pnpm run serve:payment         # Payment service (port 3005)
pnpm run serve:notification    # Notification service (port 3006)
pnpm run serve:partners        # Partners service (port 3007)
pnpm run serve:integration     # Integration service (port 3008)
pnpm run serve:frontend        # Frontend only (Vite dev server)
pnpm run start:mobile          # Mobile only (Expo)
nx run-ios mobile              # iOS simulator
nx run-android mobile          # Android emulator
```

### Build
```bash
pnpm run build                 # Build all projects
pnpm run build:services        # Build all 9 microservices
pnpm run build:frontend        # Vite → dist/frontend/
nx build mobile                # Expo export → dist/mobile/
nx build auth-service          # Single service → dist/auth-service/
```

### Testing
```bash
pnpm test                          # Test all projects
nx test auth-service               # Single service
nx test auth-service --watch       # Watch mode
nx test booking-service -- --coverage  # With coverage (output: coverage/<service>/)
```

### Lint
```bash
pnpm run lint                  # Lint all projects
nx lint auth-service           # Single service
```

### Database (Migrations & Seed)

Each service with a database has `migrate` and `seed` nx targets. The local DB ports differ from the in-container defaults, so always pass `DATABASE_URL` explicitly.

| Service | Local port | DB name |
|---|---|---|
| `search-service` | 5433 | `search_service` |
| `inventory-service` | 5434 | `travelhub` |
| `integration-service` | 5435 | `integration_service` |
| `booking-service` | 5436 | `travelhub` |
| `partners-service` | 5438 | `partners_service` |

```bash
# Search service
DATABASE_URL=postgres://postgres:postgres@localhost:5433/search_service pnpm exec nx run search-service:migrate
DATABASE_URL=postgres://postgres:postgres@localhost:5433/search_service pnpm exec nx run search-service:seed

# Inventory service
DATABASE_URL=postgres://postgres:postgres@localhost:5434/travelhub pnpm exec nx run inventory-service:migrate
DATABASE_URL=postgres://postgres:postgres@localhost:5434/travelhub pnpm exec nx run inventory-service:seed

# Integration service
pnpm exec nx run integration-service:migrate
pnpm exec nx run integration-service:seed

# Booking service
DATABASE_URL=postgres://postgres:postgres@localhost:5436/travelhub pnpm exec nx run booking-service:migrate
DATABASE_URL=postgres://postgres:postgres@localhost:5436/travelhub pnpm exec nx run booking-service:seed

# Partners service
DATABASE_URL=postgres://postgres:postgres@localhost:5438/partners_service pnpm exec nx run partners-service:migrate
DATABASE_URL=postgres://postgres:postgres@localhost:5438/partners_service pnpm exec nx run partners-service:seed
```

To fully reset and reseed from scratch:
```bash
docker compose down -v          # stop containers and delete volumes
docker compose up -d            # recreate containers (DBs will be empty)
# then run migrate + seed for each service above
```

### Docker — rebuilding images

Service images are built on top of `travelhub-base` (`docker/Dockerfile.base`), which runs `pnpm install` from the root `package.json` + `pnpm-lock.yaml`. **Whenever a new root dependency is added** (e.g. `@nestjs/schedule`), the base image must be rebuilt first or `docker compose build` will fail with `Cannot find module`:

```bash
# 1. Rebuild base image (picks up new root dependencies)
docker build --no-cache -t travelhub-base -f docker/Dockerfile.base .

# 2. Rebuild all service images
docker compose build --parallel

# 3. Start
docker compose up -d
```

If only application code changed (no new dependencies), skip step 1 — `docker compose build --parallel` is enough.


### Integration Service — Webhook Testing

The integration-service ships a helper script to generate HMAC-SHA256 signatures for manual webhook testing. Run it from the service directory or via `pnpm`:

```bash
# From workspace root
pnpm generate-hmac --secret <signing-secret> --body '<json>'

# Example
pnpm generate-hmac \
  --secret secret-partner-1 \
  --body '{"eventId":"evt-001","eventType":"room.availability.updated","occurredAt":"2026-04-01T10:00:00Z","data":{"externalRoomId":"gran-caribe-deluxe-king-ocean","date":"2027-08-01","available":false}}'

# Pipe JSON via stdin (secret from env var)
echo '<json>' | WEBHOOK_SECRET=secret-partner-1 pnpm generate-hmac

# Read body from file
pnpm generate-hmac --secret secret-partner-1 --file /tmp/payload.json
```

Output: raw hex signature + a ready-to-paste `curl` snippet with the `X-TravelHub-Signature` header.

To send a webhook event, use the signature with the partner endpoint:

```bash
# Local
curl -X POST http://localhost:3008/webhooks/<partnerId>/events \
  -H 'X-TravelHub-Signature: <signature>' \
  -H 'Content-Type: application/json' \
  -d '<json>'

# Production
curl -X POST https://travelhub-integration-service-317344419928.us-central1.run.app/webhooks/<partnerId>/events \
  -H 'X-TravelHub-Signature: <signature>' \
  -H 'Content-Type: application/json' \
  -d '<json>'
```

Seeded signing secrets (set by `integration-service:seed`):

| Partner | `partner_id` | Signing secret |
|---|---|---|
| Partner 1 (Cancún) | `a1000000-0000-0000-0000-000000000001` | `secret-partner-1` |
| Partner 2 (CDMX + Cancún hostel) | `a1000000-0000-0000-0000-000000000002` | `secret-partner-2` |

Sample CSV fixtures for bulk import testing are in `services/integration-service/scripts/`:
- `sample-properties.csv` — 3 properties (Guadalajara, Partner 1)
- `sample-rooms.csv` — 8 rooms for those properties (import properties first)

### Nx Utilities
```bash
pnpm run affected:test     # Test only projects changed vs main branch
pnpm run affected:build    # Build only changed projects
pnpm run graph             # Open dependency graph in browser
```

## Architecture

### Monorepo Layout
```
/
├── services/
│   ├── api-gateway/          # NestJS microservice (port 3000)
│   ├── auth-service/         # NestJS microservice (port 3001)
│   ├── search-service/       # NestJS microservice (port 3002)
│   ├── inventory-service/    # NestJS microservice (port 3003)
│   ├── booking-service/      # NestJS microservice (port 3004)
│   ├── payment-service/      # NestJS microservice (port 3005)
│   ├── notification-service/ # NestJS microservice (port 3006)
│   ├── partners-service/     # NestJS microservice (port 3007)
│   └── integration-service/  # NestJS microservice (port 3008)
├── frontend/src/             # React source (components, assets)
├── mobile/
│   ├── app/                  # Expo Router file-based routes
│   ├── components/           # Shared RN components
│   ├── hooks/                # Custom hooks
│   └── constants/            # App-wide constants
├── dist/                     # Build outputs (per project)
├── coverage/                 # Test coverage (per project)
├── jest.preset.js            # Shared Jest preset (@nx/jest/preset)
├── tsconfig.base.json        # Shared TS base (ES2020, decorators enabled)
└── nx.json                   # Nx config; caching enabled; defaultBase: main
```

Each project has its own `project.json` defining Nx targets (build, serve, lint, test).

### Microservices
Each service under `services/<name>/` follows the standard NestJS module pattern: `app.module.ts` → controllers → services. Entry point: `services/<name>/src/main.ts`. Services build via `nest build` (configured in `services/<name>/nest-cli.json`), compiling to `dist/<name>/`. TypeScript target is ES2023 with `nodenext` modules. Each service exposes a `GET /health` endpoint returning `{ status: 'ok', service: '<name>' }`. Communication between services: REST/HTTP only. Deployment target: Google Cloud Run (one service = one Cloud Run service). The `api-gateway` is the single entry point for frontend/mobile.

### Frontend
Standard Vite + React setup. Entry: `frontend/src/main.tsx`. The `vite.config.ts` uses `nxViteTsPaths()` for monorepo path resolution. Tests use `ts-jest` transforming `.tsx?` files via `frontend/tsconfig.spec.json`.

### Mobile
File-based routing via Expo Router (`mobile/app/`). Path alias `@/*` maps to `./` (mobile project root). The app has `typedRoutes` and `reactCompiler` experiments enabled in `mobile/app.json`. New Architecture (`newArchEnabled: true`) is active.

## ESLint

All projects use the modern ESLint **flat config** format:
- `services/<name>/eslint.config.mjs` — TypeScript type-checked rules + Prettier; `no-floating-promises: warn`, `no-explicit-any: off`
- `frontend/eslint.config.js` — React Hooks + React Refresh plugins
- `mobile/eslint.config.js` — extends `eslint-config-expo`; `import/no-unresolved` disabled (Expo handles `@` aliases)

Prettier settings: single quotes, trailing commas.

## CI

`.github/workflows/ci.yml` runs on push to `main` and on pull requests. It uses `nx affected` for lint/build/test so only changed projects run in CI. Node is provided via `.nvmrc` (Node 24). `NX_DAEMON=false` and `NX_TUI=false` are set for CI stability. Uses `pnpm install --frozen-lockfile` for clean installs.

## Performance Testing

k6 scenarios are organized under `performance-tests/scenarios/smoke/` and `performance-tests/scenarios/load/`. Each scenario reads `GATEWAY_URL` from the environment and can run locally or via GitHub Actions.

### Scenario layout

```
performance-tests/scenarios/
├── smoke/
│   ├── search.js    # 3 VUs × 2 min — quick sanity check after deploy
│   └── booking.js   # 1 VU × 5 iterations — provisional cart functional coverage
└── load/
    └── search.js    # ramp 0→30 VUs, 4 min hold, ramp down — SLA gate (p95 ≤ 800ms)
```

### Running locally

```bash
cd performance-tests

# Smoke tests
GATEWAY_URL=http://localhost:3000 k6 run scenarios/smoke/search.js
GATEWAY_URL=http://localhost:3000 k6 run scenarios/smoke/booking.js

# Load tests
GATEWAY_URL=http://localhost:3000 k6 run scenarios/load/search.js

# npm shortcuts (source .env for GATEWAY_URL automatically)
npm run test:smoke:search    # search smoke
npm run test:smoke:booking   # booking smoke
npm run test:load:search     # search load
```

HTML report is written to `performance-tests/results/summary*.html` after each run. JSON raw output goes to `performance-tests/results/results*.json`.

### Running via GitHub Actions

`.github/workflows/performance-testing.yml` — manually triggered (Actions → Performance Testing → Run workflow).

**Inputs:**

| Input | Default | Description |
|---|---|---|
| `profile` | `smoke` | `smoke` or `load` — selects which search scenario to run |
| `gateway_url` | _(blank)_ | API Gateway URL; falls back to the `GATEWAY_URL` repository variable if blank |

**Notes:**
- Runs `scenarios/<profile>/search.js`. To add the booking scenario, duplicate the "Run k6" step with `scenarios/smoke/booking.js`.
- Results are uploaded as a GitHub Actions artifact (`k6-results-<profile>-<run_id>`, retained 7 days) even when thresholds fail.
- `concurrency.group: load-testing` ensures only one load test runs at a time; a new dispatch cancels any in-flight run.

## Deployment (Pulumi)

Infrastructure is managed with Pulumi (TypeScript) in `pulumi/`. State is stored in GCS (`gs://travelhub-pulumi-state`). The backend URL is declared in `pulumi/Pulumi.yaml` so no `pulumi login` is needed.

### Prerequisites
- [Pulumi CLI](https://www.pulumi.com/docs/install/) installed
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated (`gcloud auth application-default login`)
- A GCP project with billing enabled
- A GCS bucket for Pulumi state: `gcloud storage buckets create gs://travelhub-pulumi-state --location=us-central1`
- Edit `pulumi/Pulumi.yaml` — replace `YOUR_GCP_PROJECT_ID` with your actual project ID
- `cd pulumi && npm install`

### First-time GCP setup

Enable the required APIs once per project:

```bash
gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  pubsub.googleapis.com \
  artifactregistry.googleapis.com \
  vpcaccess.googleapis.com \
  servicenetworking.googleapis.com
```

### Running Pulumi locally

```bash
# Preview changes
PULUMI_CONFIG_PASSPHRASE="" pulumi preview --stack prod --cwd pulumi

# Deploy
PULUMI_CONFIG_PASSPHRASE="" pulumi up --stack prod --cwd pulumi

# Read stack outputs
PULUMI_CONFIG_PASSPHRASE="" pulumi stack output --stack prod --cwd pulumi
```

### What `pulumi up` does

1. Builds all Docker images (base + 9 service images) and pushes to Artifact Registry
2. Creates/updates all Cloud Run services
3. Provisions shared infrastructure (Cloud SQL PostgreSQL, Memorystore Redis, Pub/Sub topics + subscriptions, VPC + Serverless VPC Access connector)

The frontend is **not** deployed by Pulumi — it requires a separate step after `pulumi up`:

```bash
# Convenience script (runs build + gcloud storage rsync):
pnpm run deploy:frontend

# Manual steps:
VITE_API_URL=$(PULUMI_CONFIG_PASSPHRASE="" pulumi stack output gatewayUrl --stack prod --cwd pulumi) \
  pnpm run build:frontend
BUCKET=$(PULUMI_CONFIG_PASSPHRASE="" pulumi stack output frontendBucket --stack prod --cwd pulumi)
gcloud storage rsync -r dist/frontend/ "gs://${BUCKET}/" --delete-unmatched-destination-objects
```

### GitHub Actions deploy

`.github/workflows/deploy.yml` — manually triggered via Actions → Deploy → Run workflow.

Required secrets (repository or `production` GitHub Environment):

| Secret | Value |
|---|---|
| `GCP_SA_KEY` | JSON key of a GCP service account with Pulumi deploy permissions |
| `GCP_PROJECT_ID` | Your GCP project ID |
| `PULUMI_CONFIG_PASSPHRASE` | Empty string `""` |

## Booking — Reservation State Machine

Reservations go through the following states:

```
[User clicks Book]
        ↓
     held  ──(15 min expires)──→  expired
        │   ──(user cancel)────→  cancelled
        │
  [payment-service.initiate() called]
        ↓
  submitted  ──(Stripe webhook: payment_intent.payment_failed)──→  failed
        │    ──(user cancel)────────────────────────────────────→  cancelled
        │                                                              │
  [Stripe webhook: payment_intent.succeeded]                [user retries payment]
        ↓                                                              │
  confirmed  ──(user cancel)──→  cancelled                            ↓
                                                          failed ──(rehold)──→ held (retry)
```

| Status | Meaning | Inventory hold | Can re-book same room? |
|---|---|---|---|
| `held` | User is in checkout, room locked | Active (15-min TTL) | No |
| `submitted` | Payment submitted to Stripe, awaiting webhook | Consumed | Yes |
| `confirmed` | Webhook fired, booking finalized | Confirmed | No |
| `expired` | Hold timed out without payment submission | Released | Yes |
| `failed` | Stripe reported payment failure | Released | Yes |
| `cancelled` | User cancelled (any non-terminal state) | Released | Yes |

### Key transitions

| Trigger | From → To | Who calls it |
|---|---|---|
| `POST /reservations` | — → `held` | Frontend (via `useBookingFlow`) |
| `POST /payment/payments/initiate` (first attempt) | `held` → `submitted` | payment-service calls `PATCH /reservations/:id/submit` internally |
| `POST /payment/payments/initiate` (retry) | `failed` → `held` → `submitted` | payment-service calls `PATCH /reservations/:id/rehold` then `PATCH /reservations/:id/submit` |
| Stripe webhook `payment_intent.succeeded` | `submitted` → `confirmed` | payment-service calls `PATCH /reservations/:id/confirm` |
| Stripe webhook `payment_intent.payment_failed` | `submitted` → `failed` | payment-service calls `PATCH /reservations/:id/fail` |
| `PATCH /reservations/:id/cancel` | any non-terminal → `cancelled` | Frontend/user |
| Hold expiry job (runs every 60s) | `held` → `expired` | booking-service `HoldExpiryService` |

### Important notes
- The partial unique index on reservations only covers `held` rows — a `submitted` reservation does **not** block a new hold for the same room/dates.
- `HoldExpiryService` only expires `held` reservations, not `submitted` ones.
- A reservation can have **multiple payment rows** (one per attempt). `payments.reservation_id` is not unique. `findByReservationId` returns the most recent row (`ORDER BY created_at DESC`).
- On payment retry, `initiate()` detects an existing payment row (`isRetry = true`), calls `rehold` to re-acquire inventory, then proceeds with a new Stripe PaymentIntent and a new payment row.
- In local dev without Stripe webhooks configured, reservations stay `submitted` after payment. Use the Stripe CLI (`stripe listen --forward-to localhost:3005/payments/webhook`) to test the full flow.

## Event Bus (Pub/Sub in GCP, RabbitMQ locally)

Events flow from `inventory-service` (publisher) to `search-service` (consumer) via a message broker selected by `MESSAGE_BROKER_TYPE`:
- `rabbitmq` (default) — used in local docker compose; AMQP topic exchange `travelhub`
- `pubsub` — used in GCP production; Google Cloud Pub/Sub

### Routing key → Pub/Sub name mapping

Dots in routing keys become hyphens for GCP resource names (both are valid identifiers):

| Routing key | Pub/Sub topic | Pub/Sub subscription (search-service) |
|---|---|---|
| `inventory.room.upserted` | `inventory-room-upserted` | `search-inventory-room-upserted` |
| `inventory.room.deleted` | `inventory-room-deleted` | `search-inventory-room-deleted` |
| `inventory.price.updated` | `inventory-price-updated` | `search-inventory-price-updated` |

Topics and subscriptions are created by Pulumi before the services start — services never create them dynamically.

### inventory-service → search-service

| Routing key | Publisher | Queue / Subscription | Trigger | Handler effect |
|---|---|---|---|---|
| `inventory.room.upserted` | `events.publisher.ts` | `search.inventory.room.upserted` | Room created or updated | Upserts full room snapshot into `room_search_index`; invalidates city Redis cache |
| `inventory.room.deleted` | `events.publisher.ts` | `search.inventory.room.deleted` | Room soft-deleted | Sets `is_active = false` in `room_search_index`; invalidates city Redis cache |
| `inventory.price.updated` | `events.publisher.ts` | `search.inventory.price.updated` | Rate created/updated | Replaces `room_price_periods` for the room; invalidates city Redis cache |

### Payload shapes

**`inventory.room.upserted`** — `InventoryRoomUpdatedEvent` (`events.types.ts`):
```ts
{
  routingKey: "inventory.room.upserted";
  timestamp: string;          // ISO-8601
  snapshot: RoomSnapshot;     // full denormalized room + property fields
}
```

**`inventory.price.updated`** — `InventoryPriceUpdatedEvent` (`events.types.ts`):
```ts
{
  routingKey: "inventory.price.updated";
  roomId: string;
  pricePeriods: Array<{ fromDate: string; toDate: string; priceUsd: number }>;
  timestamp: string;
}
```

**`inventory.room.deleted`** — `InventoryRoomDeletedEvent` (`events.types.ts`):
```ts
{
  routingKey: "inventory.room.deleted";
  roomId: string;
  propertyId: string;
  timestamp: string;
}
```

### Key files

| File | Role |
|---|---|
| `services/inventory-service/src/events/events.publisher.ts` | Publishes events — RabbitMQ or Pub/Sub based on `MESSAGE_BROKER_TYPE` |
| `services/inventory-service/src/events/events.types.ts` | `RoomSnapshot`, all event interfaces |
| `services/search-service/src/events/events.service.ts` | Consumes events — RabbitMQ or Pub/Sub based on `MESSAGE_BROKER_TYPE` |
| `services/search-service/src/events/handlers/room-upserted.handler.ts` | Maps camelCase snapshot → snake_case `RoomIndexRecord` |
| `services/search-service/src/events/handlers/availability-updated.handler.ts` | Replaces `room_price_periods` for a room |
| `services/search-service/src/events/handlers/room-deleted.handler.ts` | Sets room inactive; invalidates city Redis cache |
