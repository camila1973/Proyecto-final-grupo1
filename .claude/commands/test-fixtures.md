# Test Fixtures — índice

Antes de definir un fixture nuevo en un `*.spec.ts`, mira si ya existe en otro spec del mismo módulo y reúsalo (importarlo o copiar la forma). Esto evita drift entre tests, mantiene los datos realistas y reduce el ruido en revisiones.

## inventory-service

| Fixture | Archivo | Qué representa |
|---|---|---|
| `PROPERTY_ROW` | `services/inventory-service/src/properties/properties.service.spec.ts` | Fila de `inv_properties` con todos los campos (incluye `phone`, `email`, `address`, `currency`, `timezone`, `description`). **Versión más completa** — copia esta como base. |
| `ROOM_ROW` | `services/inventory-service/src/properties/properties.service.spec.ts` | Fila de `inv_rooms` (deluxe king ocean view, capacity 2). |
| `PROPERTY_ROW` | `properties.repository.spec.ts` / `rooms.service.spec.ts` | Variantes mínimas — **considera reemplazarlas por la versión de `properties.service.spec.ts`**. |
| `RATE_ROW` | `room-rates.service.spec.ts` / `room-rates.repository.spec.ts` | Fila de `inv_room_rates`. |
| `PUBLIC_PROPERTY` | `properties.controller.spec.ts` | Forma `PublicProperty` (DTO de salida del controller). |
| `PUBLIC_ROOM` | `rooms.controller.spec.ts` / `room-rates.service.spec.ts` | Forma `PublicRoom`. |

## booking-service

| Fixture | Archivo | Qué representa |
|---|---|---|
| `ROW` | `tax-rules/tax-rules.service.spec.ts` | Fila de `tax_rules` (IVA México). |
| `ROW` | `partner-fees/partner-fees.service.spec.ts` | Fila de `partner_fees`. |
| `RULE` | `tax-rules/tax-rules.controller.spec.ts` | DTO mínimo de tax rule para tests de controller. |
| `PREVIEW_DTO`, `CREATE_DTO`, `LOCATION`, `HOLD_ID`, `HOLD_EXPIRES_AT` | `reservations/reservations.service.spec.ts` | Inputs para flujos de cart/preview/create. |
| `BOOKER`, `ROOM`, `FROM`, `TO`, `DTO`, `PAYLOAD` | `reservations/holds.service.spec.ts` | Hold de reserva (Redis). |

## auth-service

| Fixture | Archivo | Qué representa |
|---|---|---|
| `DB_USER(overrides)` | `auth/auth.service.spec.ts` | **Factory** de fila `users` — admite overrides parciales. Patrón a seguir para fixtures con muchos campos opcionales. |
| `DB_CHALLENGE(overrides)` | `auth/auth.service.spec.ts` | Factory de MFA challenge. |

## partners-service

| Fixture | Archivo | Qué representa |
|---|---|---|
| `PROPERTY` | `clients/inventory-client.service.spec.ts` | Respuesta de inventory para un partner. |
| `FEE_DATA` | `clients/booking-client.service.spec.ts` | Respuesta de booking-service para fees. |
| `OWNER_PAYLOAD` | `clients/auth-client.service.spec.ts` | JWT payload simulado. |
| `PARTNER_ID`, `PROPERTY_ID`, `CHECK_IN_KEY` | `property-checkin-key/property-checkin-key.repository.spec.ts` | Reusan los UUIDs canónicos de los seeds. |

## api-gateway

| Fixture | Archivo | Qué representa |
|---|---|---|
| `ISSUER` | `auth/auth.middleware.spec.ts`, `auth/jwt.verifier.spec.ts` | Issuer JWT esperado (`travelhub-auth-service`). |

## UUIDs canónicos (seeds → tests de integración)

Las siguientes constantes están **duplicadas a propósito** entre `services/inventory-service/scripts/seed.ts` y `services/search-service/scripts/seed.ts`. Si tu test de integración cruza servicios, usa estos IDs y no inventes nuevos.

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

Ya están reusados en `partners-service/.../property-checkin-key.repository.spec.ts`. Cualquier nuevo spec que necesite un partner/propiedad reales debe leer de aquí.

## Frontend

Hoy **no hay fixtures centralizados** en `frontend/`. El patrón actual es definir constantes in-line por archivo de spec (ver `frontend/src/utils/month.spec.ts` o `frontend/src/pages/partner/property/edit/shared.spec.ts` como ejemplos). Si más adelante varios specs comparten la misma forma de objeto, considera extraerlos a un `_fixtures.ts` por carpeta. Hasta entonces, mantén los fixtures locales al spec y mínimos.

## Reglas

1. **Antes de inventar un fixture**, busca con `grep -rn "^const [A-Z_]\+ *=" services/<service>/src --include='*.spec.ts'` en el servicio donde estás escribiendo.
2. **Si extiendes** el shape de una tabla (migration nueva), actualiza el fixture maestro del servicio (típicamente en `<module>.service.spec.ts`) en el mismo PR.
3. **Si el mismo fixture se duplica** entre 3+ specs, vale la pena moverlo a un `__fixtures__/<table>.ts` y exportar — no antes.
4. **No copies seeds enteros** a un spec. Usa los UUIDs canónicos de la tabla de arriba si necesitas IDs realistas; el resto de los campos puede ser mínimo.
