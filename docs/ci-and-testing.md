# CI y pruebas

Este documento explica el flujo de integración continua, los comandos de prueba disponibles y los workflows principales del repo.

## CI actual

La integración continua se define en `.github/workflows/ci.yml` y cubre:

1. `typecheck` — Ejecuta `pnpm run typecheck`.
2. `lint` — Ejecuta `pnpm exec nx affected -t lint --base=$NX_BASE --head=$NX_HEAD --outputStyle=static`.
3. `build` — Ejecuta `pnpm exec nx affected -t build --base=$NX_BASE --head=$NX_HEAD --outputStyle=static`.
4. `test` — Ejecuta `pnpm exec nx run-many -t test --outputStyle=static -- --coverage`.

El workflow se dispara en `push` a `main` y en `pull_request`, y define `NX_DAEMON=false`, `NX_TUI=false` y `HUSKY=0` para estabilidad en Actions.

## Workflows del repositorio

### `.github/workflows/ci.yml`

- Validación principal de PRs y pushes a `main`.
- Comprueba compilación, lint, tests y subida de cobertura a Codecov.
- Usa `nx affected` para evitar ejecutar tareas innecesarias en cambios pequeños.

### `.github/workflows/deploy.yml`

- Se ejecuta después de CI completado en `main` o de forma manual con `workflow_dispatch`.
- Detecta cambios en `pulumi/`, en `frontend/` y en servicios afectados para decidir si hacer:
  - un deploy completo de infraestructura y servicios (`deploy-infra`), o
  - un despliegue rápido solo de servicios afectados (`deploy-services`).
- El deploy completo también actualiza el frontend con `scripts/deploy-frontend.mjs`.
- Requiere secretos GCP y Pulumi en GitHub Secrets, como `GCP_SA_KEY`, `PULUMI_CONFIG_PASSPHRASE`, `SMTP_PASS`, `STRIPE_SECRET_KEY`, `AUTH_JWT_SECRET`, `FIREBASE_PRIVATE_KEY`, etc.

### `.github/workflows/e2e-frontend.yml`

- Workflow manual para ejecutar pruebas Playwright contra el frontend desplegado.
- Valida que `GATEWAY_URL` y `FRONTEND_URL` estén presentes como repository variables o entradas del workflow.
- Instala navegadores Playwright, espera que el API y el frontend estén saludables y corre `pnpm exec nx e2e frontend`.
- Genera reportes HTML en `playwright-report/frontend` y ofrece artefactos por test en `test-results/frontend`.

### `.github/workflows/e2e-mobile.yml`

- Workflow manual para ejecutar pruebas móviles con Maestro sobre Android.
- Construye un APK local con `eas build` y ejecuta los flujos en `e2e/mobile/flows/`.
- Requiere un usuario de bypass (`e2e@travelhub.com / E2eTest1234!`) ya existente en el entorno desplegado.

### Otros workflows útiles

- `.github/workflows/mobile-build.yml` — build de app móvil para iOS/Android.
- `.github/workflows/seed.yml` — ejecución manual de seeds o datos de ejemplo.
- `.github/workflows/destroy.yml` — destrucción manual de infraestructura de Pulumi.
- `.github/workflows/publish-release.yml` — public release flow que valida, prueba y publica la app.

## Comandos principales

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

## Comandos Nx afectados

```bash
pnpm run affected:build
pnpm run affected:test
pnpm run affected:lint
```

## Probar proyectos individuales

```bash
pnpm exec nx test auth-service
pnpm exec nx test booking-service
pnpm exec nx test frontend
pnpm exec nx test mobile
pnpm exec nx lint frontend
pnpm exec nx lint mobile
```

## Pruebas end-to-end frontend

La carpeta de E2E web está en `e2e/frontend/` y usa Playwright.

Comandos disponibles:

```bash
pnpm run e2e:web
pnpm run e2e:web:headed
pnpm run e2e:web:ui
pnpm run e2e:web:flow <ruta-o-archivo>
pnpm run e2e:web:report
pnpm run e2e:web:record
```

El workflow de GitHub Actions ejecuta el target `pnpm exec nx e2e frontend` desde `.github/workflows/e2e-frontend.yml`.

## Pruebas end-to-end mobile

```bash
pnpm run e2e:mobile
pnpm run e2e:mobile:flow <flow-name>
pnpm run e2e:mobile:report
pnpm run e2e:mobile:record <flow-name>
```

## Pruebas de carga

La carga y los smoke tests están documentados en `performance-testing.md`.

- `performance-tests/` — tests locales y scripts de k6
- `.github/workflows/performance-testing.yml` — workflow manual de GitHub Actions

En GitHub Actions puedes ejecutar el workflow manual con los perfiles:

- `smoke` — smoke tests de búsqueda y booking
- `load` — test de carga de búsqueda
- `all` — ejecuta smoke + load

Localmente puedes correr los escenarios con npm desde `performance-tests`:

```bash
cd performance-tests
npm run test:load:search
```

O ejecutar todos los tests de carga y smoke:

```bash
cd performance-tests
npm run test:all
```

Estas pruebas esperan que la variable `GATEWAY_URL` apunte al API Gateway activo:

```bash
GATEWAY_URL=http://localhost:3000 npm run test:load:search
```

## Lint y formato

- `pnpm run lint` — todos los proyectos.
- `pnpm run lint:fix` — corrige automáticamente problemas donde sea posible.

## Cobertura

El job `test` sube cobertura a Codecov usando `CODECOV_TOKEN` si está disponible.

## Notas útiles

- Si un cambio solo afecta un subconjunto de proyectos, `nx affected` evita ejecutar tests/build innecesarios.
- `pnpm test` ejecuta todos los tests del monorepo en un solo comando.
- Para pruebas web E2E locales, asegúrate de tener el frontend desplegado o disponible en `FRONTEND_URL` antes de correr Playwright.
- El `e2e-frontend` workflow espera que el API Gateway y el frontend estén accesibles y saludables antes de lanzar las pruebas.
