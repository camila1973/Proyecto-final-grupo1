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
│   └── partners-service/     # Port 3007 — hotel/agency portal and dashboards
├── frontend/                 # React 19 + Vite SPA (port 4200)
└── mobile/                   # Expo 54 + React Native app (port 8081)
```

## Prerequisites

- Node.js 24
- pnpm
- Docker (for containerised deployment)
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
pnpm run serve:frontend        # Frontend        (port 4200)
pnpm run start:mobile          # Mobile (Expo)   (port 8081)

# Mobile simulators
nx run-ios mobile             # iOS simulator
nx run-android mobile         # Android emulator
```

## Docker

All services are containerised. The build uses a shared base image that installs dependencies once, then each service and the frontend build on top of it.

```bash
# Step 1 — build the shared base image (required before first docker compose up)
docker build -t travelhub-base -f docker/Dockerfile.base .

# Step 2 — build and start all services
docker compose up --build
```

| Service | Host port |
|---|---|
| Frontend | 4200 |
| API Gateway | 3000 |
| Auth | 3001 |
| Search | 3002 |
| Inventory | 3003 |
| Booking | 3004 |
| Payment | 3005 |
| Notification | 3006 |
| Partners | 3007 |

## Testing

```bash
pnpm test                              # Test all projects
nx test auth-service                   # Single service
nx test auth-service --watch           # Watch mode
nx test auth-service -- --coverage     # With coverage
pnpm run affected:test                 # Only changed projects
```

## Linting

```bash
pnpm run lint                 # Lint all projects
pnpm run lint:fix             # Lint and auto-fix
pnpm run affected:lint        # Only changed projects
```

## Type Checking

```bash
pnpm run typecheck            # Type check all projects
```

## Building

```bash
pnpm run build                # Build all projects
pnpm run build:services       # Build all 8 microservices
pnpm run build:frontend       # Build frontend → dist/frontend/
pnpm run affected:build       # Only changed projects
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
| Deployment | AWS App Runner (services), S3 + CloudFront (frontend) |

## Learn More

- [Nx Documentation](https://nx.dev)
- [NestJS Documentation](https://nestjs.com)
- [React Documentation](https://react.dev)
- [Expo Documentation](https://docs.expo.dev)
