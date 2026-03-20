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
- npm
- For mobile: iOS Simulator or Android Emulator

## Getting Started

```bash
npm install
```

## Development

```bash
npm start                     # Start all apps concurrently

# Individual services
npm run serve:api-gateway     # API Gateway     (port 3000)
npm run serve:auth            # Auth service    (port 3001)
npm run serve:search          # Search service  (port 3002)
npm run serve:inventory       # Inventory       (port 3003)
npm run serve:booking         # Booking         (port 3004)
npm run serve:payment         # Payment         (port 3005)
npm run serve:notification    # Notification    (port 3006)
npm run serve:partners        # Partners        (port 3007)
npm run serve:frontend        # Frontend        (port 4200)
npm run start:mobile          # Mobile (Expo)   (port 8081)

# Mobile simulators
nx run-ios mobile             # iOS simulator
nx run-android mobile         # Android emulator
```

## Testing

```bash
npm test                               # Test all projects
nx test auth-service                   # Single service
nx test auth-service --watch           # Watch mode
nx test auth-service -- --coverage     # With coverage
npm run affected:test                  # Only changed projects
```

## Linting

```bash
npm run lint                  # Lint all projects
npm run lint:fix              # Lint and auto-fix
npm run affected:lint         # Only changed projects
```

## Type Checking

```bash
npm run typecheck             # Type check all projects
```

## Building

```bash
npm run build                 # Build all projects
npm run build:services        # Build all 8 microservices
npm run build:frontend        # Build frontend → dist/frontend/
npm run affected:build        # Only changed projects
```

## Dependency Graph

```bash
npm run graph
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
