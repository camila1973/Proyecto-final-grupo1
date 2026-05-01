# Integration Service — Webhook Testing

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
