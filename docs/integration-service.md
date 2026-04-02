# integration-service

Port **3008**. Single entry point for all inbound external partner data: generic partner webhooks, vendor-specific PMS adapters (Hotelbeds, TravelClick, RoomRaccoon), and CSV bulk import. Translates external payloads to internal events, maps external IDs to TravelHub UUIDs, and calls `inventory-service` and `booking-service` over REST.

`api-gateway` does **not** route to this service — external partners call it directly. It is invisible to the frontend and mobile.

```
External PMS / Hotel Partners
        │
        ├── POST /webhooks/:partnerId/events   ← generic (partner conforms to TravelHub contract)
        ├── POST /webhooks/hotelbeds           ← vendor adapter
        ├── POST /webhooks/travelclick         ← vendor adapter
        ├── POST /webhooks/roomraccoon         ← vendor adapter
        └── POST /import/csv                   ← CSV bulk upload
        │
  ┌─────▼──────────────────┐
  │   integration-service  │  :3008
  │   auth + HMAC          │
  │   schema validation    │
  │   external ID mapping  │
  │   job tracking         │
  └──────┬─────────────────┘
         ├──────────────► inventory-service :3003
         └──────────────► booking-service   :3004
```

---

## Source layout

```
services/integration-service/src/
├── app.module.ts
├── main.ts
├── database/
│   ├── database.module.ts
│   ├── database.provider.ts       # KYSELY injection token
│   └── database.types.ts          # Kysely table interfaces (camelCase; CamelCasePlugin translates to SQL)
├── external-id/
│   ├── external-id.module.ts
│   └── external-id.service.ts     # resolve() / register() — all external↔internal ID lookups go here
├── webhooks/
│   ├── generic/
│   │   ├── webhooks.controller.ts # POST /webhooks/:partnerId/events
│   │   ├── webhooks.service.ts    # HMAC verify → idempotency check → route → mark processed
│   │   └── webhooks.module.ts
│   └── vendors/
│       ├── hotelbeds/             # hotelbeds.adapter.ts + hotelbeds.types.ts
│       ├── travelclick/           # travelclick.adapter.ts + travelclick.types.ts
│       ├── roomraccoon/           # roomraccoon.adapter.ts + roomraccoon.types.ts
│       └── vendors.module.ts
├── events/
│   ├── events.module.ts
│   ├── unknown-entity.error.ts    # thrown by handlers when *.updated arrives with no mapping
│   └── handlers/
│       ├── property.handler.ts    # property.created / property.updated
│       ├── room.handler.ts        # room.created / room.updated
│       ├── availability.handler.ts # room.availability.updated
│       ├── price.handler.ts       # room.price.updated (calls FxService before InventoryClient)
│       ├── booking.handler.ts     # booking.confirmed
│       └── hold.handler.ts        # hold.created / hold.released
├── csv-import/
│   ├── csv-import.controller.ts   # POST /import/csv, GET /import/csv/jobs/:jobId
│   ├── csv-import.service.ts      # validates file, writes import_jobs row, enqueues Bull job
│   ├── csv-import.processor.ts    # @Processor('csv-import') — parses CSV, calls handlers in batches of 50
│   └── csv-import.module.ts
├── fx/
│   ├── fx.service.ts              # convertToUsd() — mocked when FX_MOCK=true (default)
│   └── fx.module.ts
└── clients/
    ├── inventory.client.ts        # REST wrapper for inventory-service
    ├── booking.client.ts          # REST wrapper for booking-service
    ├── clients.module.ts
    └── upstream-service.error.ts  # thrown on non-2xx from downstream services
```

---

## Database

Postgres on port **5435** in local dev. DB name: `integration_service`.

### Tables (`database.types.ts`)

```typescript
// pms_registrations — registered partners; one row per partner
interface PmsRegistrationsTable {
  id: Generated<string>;          // uuid PK
  partnerId: string;              // FK to partner in partners-service
  name: string;
  adapterType: 'generic' | 'hotelbeds' | 'travelclick' | 'roomraccoon';
  signingSecret: string;          // HMAC-SHA256 secret
  enabled: boolean;
  createdAt: Generated<Date>;
}

// external_id_map — maps (partner, entity_type, external_id) → internal UUID
interface ExternalIdMapTable {
  id: Generated<string>;
  partnerId: string;
  entityType: 'property' | 'room' | 'booking' | 'hold';
  externalId: string;             // PMS-assigned identifier
  internalId: string;             // TravelHub internal UUID
  createdAt: Generated<Date>;
  // UNIQUE (partnerId, entityType, externalId)
}

// processed_events — idempotency log
interface ProcessedEventsTable {
  id: Generated<string>;
  partnerId: string;
  eventId: string;                // from envelope.eventId
  processedAt: Generated<Date>;
  // UNIQUE (partnerId, eventId)
}

// import_jobs — CSV import tracking
interface ImportJobsTable {
  id: Generated<string>;
  partnerId: string;
  type: 'properties' | 'rooms';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  rowCount: number;
  successCount: number;
  failureCount: number;
  errors: unknown;                // jsonb — array of { row, field, error }
  filePath: string;               // /tmp/integration-imports/<filename>
  createdAt: Generated<Date>;
  completedAt: Date | null;
}
```

Kysely uses `CamelCasePlugin` — TypeScript uses camelCase, SQL columns are snake_case.

### Migrations & seed

```bash
# Migrate
pnpm exec nx run integration-service:migrate

# Seed (inserts 2 pms_registrations + pre-seeds external_id_map for inventory/search seed properties)
pnpm exec nx run integration-service:seed
```

Seeded partners:

| Partner | `partner_id` | `signing_secret` |
|---|---|---|
| Partner 1 (Cancún) | `a1000000-0000-0000-0000-000000000001` | `secret-partner-1` |
| Partner 2 (CDMX + Cancún hostel) | `a1000000-0000-0000-0000-000000000002` | `secret-partner-2` |

---

## Authentication — HMAC-SHA256

All inbound requests (webhooks and CSV uploads) require:

```
X-TravelHub-Signature: <hex-digest>
```

Computation:
```
HMAC-SHA256(signingSecret, rawRequestBody).digest('hex')
```

Verification uses `crypto.timingSafeEqual` over the **raw body** (before JSON parsing). Returns `401` on mismatch or missing header.

Generate a signature for testing:
```bash
pnpm generate-hmac --secret secret-partner-1 --body '{"eventId":"evt-001","eventType":"property.created","occurredAt":"2026-04-01T10:00:00Z","data":{...}}'
# or pipe via stdin / --file
echo '<json>' | WEBHOOK_SECRET=secret-partner-1 pnpm generate-hmac
```

---

## Generic webhook endpoint

```
POST /webhooks/:partnerId/events
Content-Type: application/json
X-TravelHub-Signature: <hex>
```

**Request flow** (`webhooks.service.ts`):
1. Look up `pms_registrations` by `partnerId` → `404` if not found or `enabled = false`
2. Verify HMAC → `401` on failure
3. Parse raw body as JSON
4. Validate envelope fields (`eventId`, `eventType`, `occurredAt`, `data`) → `422` if missing
5. Check `processed_events` for `(partnerId, eventId)` → return `{ status: 'duplicate' }` if found
6. Route `eventType` to the correct handler (see table below)
7. Insert into `processed_events`
8. Return `{ status: 'ok' }`

On `UnknownEntityError` from a handler → `422`. On any other error → `500`.

### Event envelope

```json
{
  "eventId":   "evt-001",
  "eventType": "property.created",
  "occurredAt": "2026-04-01T10:00:00Z",
  "data": { }
}
```

### Supported event types

| `eventType` | Handler | Downstream call |
|---|---|---|
| `property.created` | `PropertyHandler` | `POST /properties` (inventory) |
| `property.updated` | `PropertyHandler` | `PATCH /properties/:id` (inventory) |
| `room.created` | `RoomHandler` | `POST /rooms` with `propertyId` in body (inventory) |
| `room.updated` | `RoomHandler` | `PATCH /rooms/:id` (inventory) |
| `room.availability.updated` | `AvailabilityHandler` | `POST /availability/block` or `/availability/unblock` (inventory) |
| `room.price.updated` | `PriceHandler` | `POST /rooms/:id/rates` (inventory); FX converts non-USD first |
| `booking.confirmed` | `BookingHandler` | `POST /bookings` (booking) |
| `hold.created` | `HoldHandler` | `POST /holds` (booking) |
| `hold.released` | `HoldHandler` | `DELETE /holds/:id` (booking) |

### Payload schemas per event type

**`property.created` / `property.updated`** (`data` field):
```json
{
  "externalId": "gran-caribe-deluxe",
  "name": "Gran Caribe Real",
  "type": "hotel",
  "city": "Cancún",
  "countryCode": "MX",
  "stars": 5
}
```

**`room.created` / `room.updated`** (`data` field):
```json
{
  "externalId": "gran-caribe-deluxe-king-ocean",
  "externalPropertyId": "gran-caribe-deluxe",
  "roomType": "double",
  "bedType": "king",
  "viewType": "ocean",
  "capacity": 2,
  "totalRooms": 12,
  "basePriceUsd": 249.00
}
```

**`room.availability.updated`** (`data` field):
```json
{
  "externalRoomId": "gran-caribe-deluxe-king-ocean",
  "date": "2027-08-01",
  "available": false
}
```

**`room.price.updated`** (`data` field):
```json
{
  "externalRoomId": "gran-caribe-deluxe-king-ocean",
  "currency": "MXN",
  "pricePeriods": [
    { "fromDate": "2026-06-01", "toDate": "2026-08-31", "priceUsd": 189.00 }
  ]
}
```

**`booking.confirmed`** (`data` field):
```json
{
  "externalBookingId": "BK-9981",
  "externalPropertyId": "gran-caribe-deluxe",
  "externalRoomId": "gran-caribe-deluxe-king-ocean",
  "guestName": "Carlos García",
  "guestEmail": "guest@example.com",
  "checkIn": "2026-05-01",
  "checkOut": "2026-05-05",
  "totalAmountUsd": 756.00
}
```

**`hold.created`** / **`hold.released`** (`data` field):
```json
{
  "externalHoldId": "HOLD-441",
  "externalRoomId": "gran-caribe-deluxe-king-ocean",
  "externalPropertyId": "gran-caribe-deluxe",
  "checkIn": "2026-05-01",
  "checkOut": "2026-05-05",
  "expiresAt": "2026-04-01T12:20:00Z"
}
```
(`expiresAt` only in `hold.created`)

### Response codes

| HTTP | Meaning |
|---|---|
| `200` | Accepted. Body: `{ "status": "ok" }` or `{ "status": "duplicate" }` |
| `401` | HMAC invalid or missing |
| `404` | Unknown partner |
| `422` | Envelope validation failed or unknown entity (no mapping for `*.updated`) |
| `500` | Upstream error — partner should retry |

---

## Vendor adapters

Pre-built adapters translate proprietary vendor payloads into the canonical internal event shape, then call the same event handlers as the generic endpoint.

| Vendor | Endpoint | Secret env var |
|---|---|---|
| Hotelbeds | `POST /webhooks/hotelbeds` | `WEBHOOK_SECRET_HOTELBEDS` |
| TravelClick | `POST /webhooks/travelclick` | `WEBHOOK_SECRET_TRAVELCLICK` |
| RoomRaccoon | `POST /webhooks/roomraccoon` | `WEBHOOK_SECRET_ROOMRACCOON` |

Key files: `src/webhooks/vendors/{vendor}/{vendor}.adapter.ts` and `{vendor}.types.ts`. The adapters use `ExternalIdService.resolve()` for ID lookups (replacing the old `findByName()` approach in `inventory-service`).

---

## External ID mapping

`ExternalIdService` (`src/external-id/external-id.service.ts`) is the single interface for all `external_id_map` queries.

```typescript
// Returns internal UUID or null
resolve(partnerId, entityType, externalId): Promise<string | null>

// Inserts mapping; silently ignores duplicate (ON CONFLICT DO NOTHING)
register(partnerId, entityType, externalId, internalId): Promise<void>
```

Handler logic:
- `*.created` event + `resolve()` returns `null` → create entity downstream → `register()` mapping
- `*.created` event + `resolve()` returns an ID → entity already exists, skip
- `*.updated` event + `resolve()` returns `null` → throw `UnknownEntityError` → caller returns `422`

---

## CSV import

### Upload

```
POST /import/csv
Content-Type: multipart/form-data

Fields:
  file       — CSV file (field name: "file")
  type       — "properties" | "rooms"
  partnerId  — TravelHub partner UUID
```

Returns `202 Accepted`:
```json
{ "jobId": "uuid", "status": "queued", "rowCount": 42 }
```

Uploaded files are written to `/tmp/integration-imports/`.

### Job status

```
GET /import/csv/jobs/:jobId
```

```json
{
  "jobId": "uuid",
  "status": "completed",
  "rowCount": 42,
  "successCount": 40,
  "failureCount": 2,
  "errors": [
    { "row": 3, "field": "countryCode", "error": "invalid value" }
  ],
  "completedAt": "2026-04-01T14:05:33Z"
}
```

### Properties CSV format

```csv
externalId,name,type,city,countryCode,stars
fiesta-americana-gdl,Fiesta Americana Guadalajara,hotel,Guadalajara,MX,5
```

Required columns: `externalId`, `name`, `type`, `city`, `countryCode`
Optional: `stars`

### Rooms CSV format

```csv
externalId,externalPropertyId,roomType,capacity,totalRooms,basePriceUsd
fiesta-gdl-superior-king,fiesta-americana-gdl,double,2,30,189.00
```

Required columns: `externalId`, `externalPropertyId`, `roomType`, `capacity`, `totalRooms`, `basePriceUsd`
Optional: `bedType`, `viewType`

Import properties first — rooms reference `externalPropertyId` which must already be in `external_id_map`.

Sample CSV fixtures: `services/integration-service/scripts/sample-properties.csv` and `sample-rooms.csv`

### Processing

Bull queue (`csv-import`) backed by Redis. `CsvImportProcessor` processes rows in **batches of 50** via `csv-parse` streaming. Individual row failures are collected into `errors[]` and do not fail the job. The job fails only on systemic errors (DB down, unreadable file). Bull is configured with `attempts: 3`, exponential backoff.

---

## FX conversion

`FxService.convertToUsd(amount, currency)` is called by `PriceHandler` when `currency !== 'USD'`.

- `FX_MOCK=true` (default): returns `amount` unchanged, logs a warning
- `FX_MOCK=false`: calls `POST ${PAYMENT_SERVICE_URL}/fx/convert` → `{ amountUsd }`

`payment-service` does not yet implement `/fx/convert`. Keep `FX_MOCK=true` until it does.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3008` | HTTP port |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5435/integration_service` | Postgres connection |
| `REDIS_HOST` | `localhost` | Redis host (shared with search-service) |
| `REDIS_PORT` | `6379` | Redis port |
| `INVENTORY_SERVICE_URL` | `http://localhost:3003` | inventory-service base URL |
| `BOOKING_SERVICE_URL` | `http://localhost:3004` | booking-service base URL |
| `PAYMENT_SERVICE_URL` | `http://localhost:3005` | payment-service base URL (FX conversion) |
| `FX_MOCK` | `true` | Set to `false` to call real payment-service FX endpoint |
| `WEBHOOK_SECRET_HOTELBEDS` | — | Signing secret for Hotelbeds adapter |
| `WEBHOOK_SECRET_TRAVELCLICK` | — | Signing secret for TravelClick adapter |
| `WEBHOOK_SECRET_ROOMRACCOON` | — | Signing secret for RoomRaccoon adapter |

---

## Running locally

```bash
# Start the service
pnpm run serve:integration

# Migrate and seed the DB
pnpm exec nx run integration-service:migrate
pnpm exec nx run integration-service:seed

# Run tests
nx test integration-service

# Generate HMAC signature for manual testing
pnpm generate-hmac --secret secret-partner-1 --body '<json>'
```

---

## Key design decisions

**Raw body for HMAC.** `main.ts` uses `express.raw({ type: 'application/json' })` before NestJS JSON parsing so `req.body` is a `Buffer`. Signature verification must happen before parsing to prevent body-transformation attacks.

**External ID mapping owns identity.** All entity creation goes through `ExternalIdService`. Vendor adapters no longer match properties by name (`findByName` was removed) — they use the mapping table.

**Idempotency via `processed_events`.** Events with a duplicate `(partnerId, eventId)` pair return `200 { status: 'duplicate' }` without calling downstream services.

**InventoryClient actual API shape.** The inventory-service API differs from REST conventions in two places:
- Room creation: `POST /rooms` with `propertyId` in body (not `POST /properties/:id/rooms`)
- Availability: `POST /availability/block` or `/availability/unblock` with `{ roomId, fromDate, toDate }` body (not `PATCH /rooms/:id/availability`)

**CSV type coercion.** CSV values are all strings. DTOs for CSV rows use `@Type(() => Number)` from `class-transformer` on numeric fields (`capacity`, `totalRooms`, `basePriceUsd`, `stars`) so `class-validator`'s `@IsNumber()` works correctly.
