# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TravelHub** is an Nx 22.5.1 monorepo with three applications sharing a single `node_modules/`:
- **services/** — 8 independent NestJS 11 microservices (see port map below)
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

## Commands

Always run tasks through `nx` commands, not underlying tools directly. Prefix with `npm exec nx` or use `nx` directly.

### Development
```bash
npm install                   # Install all dependencies
npm start                     # Start all apps concurrently
npm run serve:api-gateway     # API Gateway (port 3000)
npm run serve:auth            # Auth service (port 3001)
npm run serve:search          # Search service (port 3002)
npm run serve:inventory       # Inventory service (port 3003)
npm run serve:booking         # Booking service (port 3004)
npm run serve:payment         # Payment service (port 3005)
npm run serve:notification    # Notification service (port 3006)
npm run serve:partners        # Partners service (port 3007)
npm run serve:frontend        # Frontend only (Vite dev server)
npm run start:mobile          # Mobile only (Expo)
nx run-ios mobile             # iOS simulator
nx run-android mobile         # Android emulator
```

### Build
```bash
npm run build                 # Build all projects
npm run build:services        # Build all 8 microservices
npm run build:frontend        # Vite → dist/frontend/
nx build mobile               # Expo export → dist/mobile/
nx build auth-service         # Single service → dist/auth-service/
```

### Testing
```bash
npm test                          # Test all projects
nx test auth-service              # Single service
nx test auth-service --watch      # Watch mode
nx test booking-service -- --coverage  # With coverage (output: coverage/<service>/)
```

### Lint
```bash
npm run lint                  # Lint all projects
nx lint auth-service          # Single service
```

### Nx Utilities
```bash
npm run affected:test     # Test only projects changed vs main branch
npm run affected:build    # Build only changed projects
npm run graph             # Open dependency graph in browser
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
│   └── partners-service/     # NestJS microservice (port 3007)
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
Each service under `services/<name>/` follows the standard NestJS module pattern: `app.module.ts` → controllers → services. Entry point: `services/<name>/src/main.ts`. Services build via `nest build` (configured in `services/<name>/nest-cli.json`), compiling to `dist/<name>/`. TypeScript target is ES2023 with `nodenext` modules. Each service exposes a `GET /health` endpoint returning `{ status: 'ok', service: '<name>' }`. Communication between services: REST/HTTP only. Deployment target: AWS App Runner (one service = one App Runner service). The `api-gateway` is the single entry point for frontend/mobile.

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

`.github/workflows/ci.yml` runs on push to `main` and on pull requests. It uses `nx affected` for lint/build/test so only changed projects run in CI. Node is provided via `.nvmrc` (Node 24). `NX_DAEMON=false` and `NX_TUI=false` are set for CI stability. Uses `npm ci` for clean installs.
