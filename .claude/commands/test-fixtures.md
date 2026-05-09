# Test Fixtures — index

Before defining a new fixture in a `*.spec.ts`, check whether one already exists in another spec of the same module and reuse it (import it or copy the shape). This avoids drift across tests, keeps the data realistic, and reduces review noise.

## inventory-service

| Fixture | File | Represents |
|---|---|---|
| `PROPERTY_ROW` | `services/inventory-service/src/properties/properties.service.spec.ts` | Row of `inv_properties` with all fields (includes `phone`, `email`, `address`, `currency`, `timezone`, `description`). **Most complete version** — copy this one as the baseline. |
| `ROOM_ROW` | `services/inventory-service/src/properties/properties.service.spec.ts` | Row of `inv_rooms` (deluxe king ocean view, capacity 2). |
| `PROPERTY_ROW` | `properties.repository.spec.ts` / `rooms.service.spec.ts` | Slim variants — **consider replacing them with the version from `properties.service.spec.ts`**. |
| `RATE_ROW` | `room-rates.service.spec.ts` / `room-rates.repository.spec.ts` | Row of `inv_room_rates`. |
| `PUBLIC_PROPERTY` | `properties.controller.spec.ts` | `PublicProperty` shape (controller output DTO). |
| `PUBLIC_ROOM` | `rooms.controller.spec.ts` / `room-rates.service.spec.ts` | `PublicRoom` shape. |

## booking-service

| Fixture | File | Represents |
|---|---|---|
| `ROW` | `tax-rules/tax-rules.service.spec.ts` | Row of `tax_rules` (Mexico VAT). |
| `ROW` | `partner-fees/partner-fees.service.spec.ts` | Row of `partner_fees`. |
| `RULE` | `tax-rules/tax-rules.controller.spec.ts` | Minimal tax rule DTO for controller tests. |
| `PREVIEW_DTO`, `CREATE_DTO`, `LOCATION`, `HOLD_ID`, `HOLD_EXPIRES_AT` | `reservations/reservations.service.spec.ts` | Inputs for cart/preview/create flows. |
| `BOOKER`, `ROOM`, `FROM`, `TO`, `DTO`, `PAYLOAD` | `reservations/holds.service.spec.ts` | Reservation hold (Redis). |

## auth-service

| Fixture | File | Represents |
|---|---|---|
| `DB_USER(overrides)` | `auth/auth.service.spec.ts` | **Factory** for a `users` row — accepts partial overrides. Pattern to follow for fixtures with many optional fields. |
| `DB_CHALLENGE(overrides)` | `auth/auth.service.spec.ts` | MFA challenge factory. |

## partners-service

| Fixture | File | Represents |
|---|---|---|
| `PROPERTY` | `clients/inventory-client.service.spec.ts` | inventory-service response for a partner. |
| `FEE_DATA` | `clients/booking-client.service.spec.ts` | booking-service response for fees. |
| `OWNER_PAYLOAD` | `clients/auth-client.service.spec.ts` | Mocked JWT payload. |
| `PARTNER_ID`, `PROPERTY_ID`, `CHECK_IN_KEY` | `property-checkin-key/property-checkin-key.repository.spec.ts` | Reuse the canonical UUIDs from the seeds. |

## api-gateway

| Fixture | File | Represents |
|---|---|---|
| `ISSUER` | `auth/auth.middleware.spec.ts`, `auth/jwt.verifier.spec.ts` | Expected JWT issuer (`travelhub-auth-service`). |

## Canonical UUIDs (seeds → integration tests)

The following constants are **duplicated on purpose** between `services/inventory-service/scripts/seed.ts` and `services/search-service/scripts/seed.ts`. If your integration test crosses services, use these IDs and don't invent new ones.

```ts
const PARTNER_1 = "a1000000-0000-0000-0000-000000000001";
const PARTNER_2 = "a1000000-0000-0000-0000-000000000002";

const PROP_CANCUN_1 = "b1000000-0000-0000-0000-000000000001"; // Gran Caribe Resort & Spa
const PROP_CANCUN_2 = "b1000000-0000-0000-0000-000000000002"; // Playa Azul Hotel
const PROP_CANCUN_3 = "b1000000-0000-0000-0000-000000000003"; // Hostal Sol Cancún
const PROP_CDMX_1   = "b1000000-0000-0000-0000-000000000004"; // Hotel Histórico Centro
const PROP_CDMX_2   = "b1000000-0000-0000-0000-000000000005"; // Condesa Inn

const ROOM = (n: number) => `c1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
```

These are already reused in `partners-service/.../property-checkin-key.repository.spec.ts`. Any new spec that needs a real partner/property should read from here.

## Frontend

There are **no centralized fixtures** in `frontend/` today. The current pattern is to define inline constants per spec file (see `frontend/src/utils/month.spec.ts` or `frontend/src/pages/partner/property/edit/shared.spec.ts` as examples). If multiple specs end up sharing the same object shape later, consider extracting them into a `_fixtures.ts` per folder. Until then, keep fixtures local to the spec and minimal.

## Rules

1. **Before inventing a fixture**, search with `grep -rn "^const [A-Z_]\+ *=" services/<service>/src --include='*.spec.ts'` in the service you're working in.
2. **When extending** a table's shape (new migration), update the service's master fixture (typically in `<module>.service.spec.ts`) in the same PR.
3. **When the same fixture is duplicated** across 3+ specs, it's worth moving it into `__fixtures__/<table>.ts` and exporting — not before.
4. **Don't copy entire seeds** into a spec. Use the canonical UUIDs from the table above when you need realistic IDs; the rest of the fields can stay minimal.
