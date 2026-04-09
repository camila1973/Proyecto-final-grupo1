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

Infrastructure is managed with [Pulumi](https://www.pulumi.com/) in `pulumi/`. State lives in S3 (`s3://travelhub-pulumi-state`). Services run on AWS App Runner; the frontend is served from S3 + CloudFront.

### Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/install/)
- AWS credentials with access to the account
- `cd pulumi && npm install`

### Deploy locally

```bash
cd pulumi

# Export credentials (needed when using AWS SSO / login sessions)
eval "$(aws configure export-credentials --format env)"

# Preview
AWS_REGION=us-east-1 PULUMI_CONFIG_PASSPHRASE="" pulumi preview --stack prod

# Deploy backend (builds Docker images, pushes to ECR, updates App Runner)
AWS_REGION=us-east-1 PULUMI_CONFIG_PASSPHRASE="" pulumi up --stack prod

# Deploy frontend (run after pulumi up)
cd ..
pnpm run build:frontend
BUCKET=$(AWS_REGION=us-east-1 PULUMI_CONFIG_PASSPHRASE="" pulumi stack output frontendBucket --stack prod --cwd pulumi)
CDN_ID=$(AWS_REGION=us-east-1 PULUMI_CONFIG_PASSPHRASE="" pulumi stack output cdnId --stack prod --cwd pulumi)
aws s3 sync dist/frontend/ "s3://${BUCKET}/" --delete
aws cloudfront create-invalidation --distribution-id "${CDN_ID}" --paths "/*"
```

### Deploy via GitHub Actions

Trigger manually: **Actions → Deploy → Run workflow**

Required secrets in the `production` GitHub Environment:

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM key with ECR / App Runner / S3 / CloudFront access |
| `AWS_SECRET_ACCESS_KEY` | Corresponding secret key |
| `PULUMI_CONFIG_PASSPHRASE` | Empty string (no secret encryption on this project) |

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
