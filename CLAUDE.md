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

## Git Practices

### Branches
- Always create branches from `main` (`git checkout main && git pull && git checkout -b <branch>`).
- Never push directly to `main`.
- Branch naming: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`.

### Pull Requests
- Title and description must be written **in Spanish**.
- Before opening a PR, ask: **"¿Este PR cierra un issue o es parte de uno?"**
  - If it closes one → add `Closes #<número>` in the description.
  - If it is part of one → add `Parte de #<número>` instead.
  - If unrelated to any issue → omit the tag.
- Use the template defined in `.github/PULL_REQUEST_TEMPLATE.md` for every PR body.

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

> Use `/db` for per-service migration and seed commands, port map, and full reset instructions.

### Docker — Rebuilding Images

> Use `/docker-rebuild` for instructions on rebuilding the base image after adding new root dependencies.

### Integration Service — Webhook Testing

> Use `/webhook-test` for HMAC generation, curl examples, seeded signing secrets, and CSV fixture info.

### Nx Utilities
```bash
pnpm run affected:test     # Test only projects changed vs main branch
pnpm run affected:build    # Build only changed projects
pnpm run graph             # Open dependency graph in browser
```

### Adding dependencies

This is a pnpm workspace monorepo. App and service deps belong in **their workspace's** `package.json`, **not** the root. Always use `--filter`:

```bash
pnpm add <pkg> --filter mobile          # Expo / React Native deps
pnpm add <pkg> --filter frontend        # React / Vite deps
pnpm add <pkg> --filter auth-service    # NestJS service deps (same shape for any service)
```

Only repo-wide tooling belongs at root (`pnpm add -w <pkg>`): `nx`, `@nx/*`, `prettier`, `eslint`, `typescript`, `husky`, `lint-staged`. **Never** install `expo-*`, `react-native-*`, `@nestjs/*`, or any runtime/app dep at root — Expo autolinking, Metro resolver, EAS Build, and per-service builds all read from the workspace's `package.json`. Root-installed app deps work by hoisting coincidence and silently break autolinking, SDK version checks, and EAS uploads.

**For mobile (Expo), always use `npx expo install` instead of `pnpm add`:**
```bash
cd mobile && npx expo install <expo-or-rn-pkg>
```
Expo CLI reads `mobile/package.json`'s `expo` version and picks a release of the requested package that matches that SDK. A plain `pnpm add expo-foo` resolves to `latest` on npm, which can land you on a future SDK's version and produce build failures like `Unresolved reference 'convertToJSValue'` when the native API changed between SDKs. The pin should always come from `expo install`, not hand-picked.

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

## Authentication & API Gateway

The **api-gateway** validates every JWT centrally and forwards trusted identity headers (`X-User-Id`, `X-User-Email`, `X-User-Role`, `X-Partner-Id`, `X-Property-Id`) to downstream services. Downstream services do **not** verify JWTs — they trust the headers. The model is **deny-by-default**: routes require a valid token unless explicitly listed in `services/api-gateway/src/auth/public-routes.ts`.

When adding a new endpoint:
- **Authenticated route (default)** — no gateway change. Just add the controller; the gateway protects it automatically and your handler can read `req.headers["x-user-id"]` etc.
- **Public route** — add a regex entry in `public-routes.ts`. Pin the HTTP method, prefer narrow patterns over broad prefixes, and add a comment explaining why it's public.

> Use `/auth` for the full header contract, public-route rules, secret management across local/docker/Pulumi, and what the gateway does *not* do (authorization, revocation).

## ESLint

All projects use the modern ESLint **flat config** format:
- `services/<name>/eslint.config.mjs` — TypeScript type-checked rules + Prettier; `no-floating-promises: warn`, `no-explicit-any: off`
- `frontend/eslint.config.js` — React Hooks + React Refresh plugins
- `mobile/eslint.config.js` — extends `eslint-config-expo`; `import/no-unresolved` disabled (Expo handles `@` aliases)

Prettier settings: single quotes, trailing commas.

## CI

`.github/workflows/ci.yml` runs on push to `main` and on pull requests. It uses `nx affected` for lint/build/test so only changed projects run in CI. Node is provided via `.nvmrc` (Node 24). `NX_DAEMON=false` and `NX_TUI=false` are set for CI stability. Uses `pnpm install --frozen-lockfile` for clean installs.

## E2E Testing (Mobile — Maestro)

> Use `/e2e` for Maestro prerequisites, flow layout, run commands, and key design decisions (deep-link navigation, unique email generation, iOS keyboard quirks).

## Performance Testing

> Use `/perf-test` for k6 scenario layout, local run commands, and GitHub Actions workflow details.

## Deployment (Pulumi)

> Use `/deploy` for Pulumi prerequisites, first-time GCP setup, local deploy commands, and GitHub Actions secrets.

## Booking — Reservation State Machine

Reservations go through the following states:

```
[User clicks Book]
        ↓
     held  ──(15 min expires)──→  expired                       (terminal)
        │   ──(api cancel)─────→  cancelled                     (terminal, API-only — see notes)
        │
  [payment-service.initiate() called]
        ↓
  submitted  ──(Stripe webhook: payment_intent.payment_failed)──→  failed
        │    ──(user cancel)────────────────────────────────────→  cancelled
        │                                                              │
  [Stripe webhook: payment_intent.succeeded]                [user retries payment]
        ↓                                                              │
  confirmed  ──(user cancel)────────→  cancelled                       ↓
        │    ──(no-show job, hourly)─→  no_show     (terminal) failed ──(rehold)──→ held (retry)
        │    ──(guest check-in)──────→  checked_in
                                            │
                                            └──(checkout)──→  checked_out  (terminal)
```

| Status | Meaning | Inventory hold | Can re-book same room? |
|---|---|---|---|
| `held` | User is in checkout, room locked | Active (15-min TTL) | No |
| `submitted` | Payment submitted to Stripe, awaiting webhook | Consumed | Yes |
| `confirmed` | Webhook fired, booking finalized | Confirmed | No |
| `checked_in` | Guest has arrived and checked in | Consumed | No |
| `checked_out` | Guest stayed and checked out (terminal — happy path) | Consumed | No |
| `no_show` | Guest never arrived past check-in date (terminal — billable) | Consumed | No |
| `expired` | Hold timed out without payment submission (terminal) | Released | Yes |
| `failed` | Stripe reported payment failure | Released | Yes |
| `cancelled` | User cancelled (any non-terminal state) (terminal) | Released | Yes |

### Key transitions

| Trigger | From → To | Who calls it |
|---|---|---|
| `POST /reservations` | — → `held` | Frontend (via `useBookingFlow`) |
| `POST /payment/payments/initiate` (first attempt) | `held` → `submitted` | payment-service calls `PATCH /reservations/:id/submit` internally |
| `POST /payment/payments/initiate` (retry) | `failed` → `held` → `submitted` | payment-service calls `PATCH /reservations/:id/rehold` then `PATCH /reservations/:id/submit` |
| Stripe webhook `payment_intent.succeeded` | `submitted` → `confirmed` | payment-service calls `PATCH /reservations/:id/confirm` |
| Stripe webhook `payment_intent.payment_failed` | `submitted` → `failed` | payment-service calls `PATCH /reservations/:id/fail` |
| `PATCH /reservations/:id/cancel` | any non-terminal → `cancelled` | Frontend/user (UI exposes it only for `submitted` on web and `confirmed` on both clients — see notes) |
| `PATCH /reservations/:id/partner-cancel` | `confirmed` → `cancelled` | Partner dashboard (hotel-initiated) |
| `PATCH /reservations/:id/checkin` | `confirmed` → `checked_in` | Guest (key) or partner |
| `PATCH /reservations/:id/checkout` | `checked_in` → `checked_out` | Partner dashboard |
| Hold expiry job (runs every 60s) | `held` → `expired` | booking-service `HoldExpiryService` |
| No-show job (runs hourly) | `confirmed` (with `check_in < today`) → `no_show` | booking-service `NoShowService` |

### Important notes
- `held → cancelled` is accepted by the API (`reservations.repository.ts` only blocks already-terminal `expired`/`cancelled`) but is **not exposed in any UI today**. Both mobile (`mobile/app/(tabs)/trips.tsx`) and web (`frontend/src/pages/trips/index.tsx`) render Complete Payment on a held row, with no cancel affordance — held rows in production terminal either via payment (`submitted`) or via the 15-min hold expiry (`expired`). The transition is kept available for ops/admin tooling and direct API callers; it is not a guest-facing path.
- The UI exposes cancel as follows: mobile shows cancel only on `confirmed`; web shows cancel on `submitted` and `confirmed`. Partner cancel is `confirmed`-only (guarded server-side).
- The partial unique index on reservations only covers `held` rows — a `submitted` reservation does **not** block a new hold for the same room/dates.
- `HoldExpiryService` only expires `held` reservations, not `submitted` ones.
- A reservation can have **multiple payment rows** (one per attempt). `payments.reservation_id` is not unique. `findByReservationId` returns the most recent row (`ORDER BY created_at DESC`).
- On payment retry, `initiate()` detects an existing payment row (`isRetry = true`), calls `rehold` to re-acquire inventory, then proceeds with a new Stripe PaymentIntent and a new payment row.
- In local dev without Stripe webhooks configured, reservations stay `submitted` after payment. Use the Stripe CLI (`stripe listen --forward-to localhost:3005/payments/webhook`) to test the full flow.
- `partner-cancel` only accepts `confirmed` reservations. `submitted` is blocked because cancelling mid-payment races the Stripe webhook with no refund wired; `checked_in` is blocked because that case should become a separate early-checkout operation. Refunds for partner-initiated cancels on `confirmed` reservations are not yet implemented (TODO in `reservations.service.ts`).
- `NoShowService` runs hourly and flips `confirmed` reservations whose `check_in` date has already passed to `no_show`. It does **not** call `inventoryClient.unhold` — no-show is treated as billable revenue (room stays consumed for the stay window), consistent with PMS industry convention.

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

### booking-service → notification-service

booking-service publishes a domain event on every customer-visible status transition. notification-service consumes them, looks up a renderer per `(routingKey, actor)`, and emails the guest when the renderer returns a non-null `RenderedMessage`. Domain facts only — booking does not encode subject/channel/recipient. notification-service still exposes `POST /notifications/send` for payment-service and auth-service, which remain on synchronous HTTP.

| Routing key | Pub/Sub topic | Subscription (notification-service) | Emails today? |
|---|---|---|---|
| `booking.cancelled` | `booking-cancelled` | `notification-booking-cancelled` | partner only ("Reserva cancelada") |
| `booking.confirmed` | `booking-confirmed` | `notification-booking-confirmed` | yes ("Reserva confirmada") |
| `booking.checked_in` | `booking-checked_in` | `notification-booking-checked_in` | no |
| `booking.checked_out` | `booking-checked_out` | `notification-booking-checked_out` | yes ("Check-out completado") |
| `booking.failed` | `booking-failed` | `notification-booking-failed` | no |
| `booking.expired` | `booking-expired` | `notification-booking-expired` | no |
| `booking.no_show` | `booking-no_show` | `notification-booking-no_show` | no |

Event payload (kept in sync between `services/booking-service/src/events/events.types.ts` and `services/notification-service/src/events/types.ts`):

```ts
{
  routingKey: BookingRoutingKey;
  reservationId: string;
  partnerId: string;
  propertyId: string;
  roomId: string;
  bookerId: string;
  guestInfo: GuestInfo | null;
  checkIn: string;
  checkOut: string;
  actor: "guest" | "partner" | "system";
  reason?: string;
  timestamp: string;
}
```

Templates live in `services/notification-service/src/events/templates/`, one file per routing key. Each template is a pure function `(event) => RenderedMessage | null`; returning `null` means "this transition does not email anyone today" (single decision point). `submitted` and `held` are not emitted yet — internal payment churn.

## Partners — Data Model & Navigation

```
Partner (partners_service.partners)
└── User/Owner  (auth_service.users, role = "partner", partnerId = partner.id)
└── Property[]  (inventory_service.properties, partnerId = property.partnerId)
    ├── Manager[]  (auth_service.users, role = "manager", propertyId = user.propertyId) [deferred]
    └── Reservation[]  (booking_service.reservations, propertyId = reservation.propertyId)
```

### Navigation (frontend)

| Route | Page | Shows |
|---|---|---|
| `/mi-hotel` | `MiHotelPage` | All properties for the logged-in partner (derived from reservations) |
| `/mi-hotel/:propertyId` | `PropertyDashboardPage` | Metrics + reservations for one property |
| `/mi-hotel/:propertyId/pagos` | `PagosPropertyPage` | Payments for one property |

### Key identifiers
- `user.partnerId` — set in JWT for `role = "partner"` users; used as the scope for all partner API calls
- `propertyId` — UUID from inventory-service; present in `reservation.propertyId` and `reservation.snapshot`
- Manager assignment (auth → property) is **not yet implemented**; the properties table shows `—` for that column
- Properties with zero reservations won't appear in the partner overview until an inventory-service integration is added

### partners-service endpoints

| Method | Path | Returns |
|---|---|---|
| `GET` | `/partners/:id/properties` | Property list derived from booking reservations |
| `GET` | `/partners/:id/hotel-state?month=&roomType=&propertyId=` | Metrics + reservations (property-scoped when `propertyId` given) |
| `GET` | `/partners/:id/payments?month=&page=&pageSize=&propertyId=` | Paginated payment rows (property-scoped when `propertyId` given) |
