[![CI](https://github.com/camila1973/Proyecto-final-grupo1/actions/workflows/ci.yml/badge.svg)](https://github.com/camila1973/Proyecto-final-grupo1/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/camila1973/Proyecto-final-grupo1/graph/badge.svg?token=SOH7ECOANV)](https://codecov.io/github/camila1973/Proyecto-final-grupo1)

# TravelHub

Nx 22 monorepo for the TravelHub platform — a hotel and travel booking system built with NestJS microservices, React, and React Native.

## Structure

```
/
├── services/
│   ├── api-gateway/          # Port 3000 — routes requests, JWT validation, rate limiting
│   ├── auth-service/         # Port 3001 — registration, login, JWT, MFA, RBAC
│   ├── search-service/       # Port 3002 — property search and ranking
│   ├── inventory-service/    # Port 3003 — room/rate/availability management
│   ├── booking-service/      # Port 3004 — reservations, cart, fare calculation
│   ├── payment-service/      # Port 3005 — Stripe/MercadoPago/PayPal, fraud detection
│   ├── notification-service/ # Port 3006 — email and push notifications
│   ├── partners-service/     # Port 3007 — hotel/agency portal and dashboards
│   └── integration-service/  # Port 3008 — PMS webhooks, CSV imports, external ID mapping
├── frontend/                 # React 19 + Vite SPA (port 4200)
└── mobile/                   # Expo 54 + React Native app (port 8081)
```

## Documentation

La documentación técnica principal está centralizada en `docs/`. Empieza por el índice:

- [docs/index.md](docs/index.md) — índice y Quickstart (despliegue rápido)

Dentro de `docs/` encontrarás guías más detalladas como `setup.md`, `architecture.md`, `deployment.md` y `ci-and-testing.md`.

## Prerequisites

- Node.js 24
- pnpm
- For mobile: iOS Simulator or Android Emulator

## Getting Started

```bash
pnpm install
```

## Development

```bash
pnpm start                     # Start all apps concurrently

# Individual services
pnpm run serve:api-gateway     # API Gateway     (port 3000)
pnpm run serve:auth            # Auth service    (port 3001)
pnpm run serve:search          # Search service  (port 3002)
pnpm run serve:inventory       # Inventory       (port 3003)
pnpm run serve:booking         # Booking         (port 3004)
pnpm run serve:payment         # Payment         (port 3005)
pnpm run serve:notification    # Notification    (port 3006)
pnpm run serve:partners        # Partners        (port 3007)
pnpm run serve:integration     # Integration     (port 3008)
pnpm run serve:frontend        # Frontend        (port 4200)
pnpm run start:mobile          # Mobile (Expo)   (port 8081)

# Mobile simulators
nx run-ios mobile             # iOS simulator
nx run-android mobile         # Android emulator
```

## Testing

```bash
pnpm test                                          # Test all projects
nx test auth-service                               # Single service
nx test auth-service --watch                       # Watch mode
nx test booking-service -- --coverage              # With coverage
pnpm run affected:test                             # Only changed projects
```

## Linting

```bash
pnpm run lint                 # Lint all projects
nx lint auth-service          # Single service
```

## Building

```bash
pnpm run build                 # Build all projects
pnpm run build:services        # Build all 9 microservices
pnpm run build:frontend        # Build frontend → dist/frontend/
pnpm run affected:build        # Only changed projects
```

## Dependency Graph

```bash
pnpm run graph
```

## CI

GitHub Actions runs on every push to `main` and on pull requests:

1. **Type check** — all projects
2. **Lint** — affected projects only
3. **Build** — affected projects only
4. **Test** — affected projects only, with coverage
5. **Coverage** — uploaded to Codecov (requires `CODECOV_TOKEN` repository secret)

## Deployment

Infrastructure is managed with [Pulumi](https://www.pulumi.com/) in `pulumi/`. The current deployment target is Google Cloud Platform: Cloud Run, Cloud SQL, Memorystore, Pub/Sub, Cloud Storage and Secret Manager.

For full production deployment instructions and required secrets, consulte `DEPLOYMENT.md`.

### Local deployment commands

```bash
pnpm run infra:install
pnpm run infra:preview
pnpm run infra:up
pnpm run infra:down
pnpm run deploy:frontend
```

### GitHub Actions deployment

El workflow de despliegue está en `.github/workflows/deploy.yml`.

- `deploy-infra` se ejecuta cuando cambian archivos en `pulumi/` o el despliegue se dispara manualmente.
- `deploy-services` construye y despliega únicamente los servicios afectados.
- `deploy-frontend` despliega el frontend cuando solo cambia `frontend/`.

### Notas clave

- El estado de Pulumi se almacena en un bucket de GCS.
- El frontend se despliega con `scripts/deploy-frontend.mjs`.
- El proveedor actual es GCP, no AWS.

## Code Quality

- **Pre-commit**: Husky runs lint-staged (ESLint + Prettier) on staged files only
- **CI**: type checking, linting, building, and testing enforced on every PR

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Nx 22.5 |
| Backend | NestJS 11, Node.js 24 |
| Frontend | React 19, Vite 7 |
| Mobile | Expo 54, React Native 0.81 |
| Language | TypeScript 5 |
| Testing | Jest 30, ts-jest |
| Linting | ESLint 9 (flat config), Prettier |
| Deployment | GCP Cloud Run, Cloud SQL, Cloud Storage + Pulumi |

## Learn More

- [Nx Documentation](https://nx.dev)
- [NestJS Documentation](https://nestjs.com)
- [React Documentation](https://react.dev)
- [Expo Documentation](https://docs.expo.dev)
