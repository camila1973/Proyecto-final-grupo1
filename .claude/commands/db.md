# Database — Migrations & Seed

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
