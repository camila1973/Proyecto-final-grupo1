# CI y pruebas

Este documento explica el flujo de integración continua y los comandos de prueba disponibles.

## CI actual

La integración continua se define en `.github/workflows/ci.yml` y tiene estos pasos:

1. `typecheck` — Ejecuta `pnpm run typecheck`.
2. `lint` — Ejecuta `nx affected -t lint` para los proyectos cambiados.
3. `build` — Ejecuta `nx affected -t build` para los proyectos cambiados.
4. `test` — Ejecuta `nx run-many -t test --outputStyle=static -- --coverage`.

El flujo usa `NX_DAEMON=false` y `NX_TUI=false` para estabilidad.

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

## Pruebas end-to-end mobile

```bash
pnpm run e2e:mobile
pnpm run e2e:mobile:register
pnpm run e2e:mobile:record
```

## Lint y formato

- `pnpm run lint` — todos los proyectos
- `pnpm run lint:fix` — corrige automáticamente problemas donde sea posible

## Cobertura

El job `test` sube cobertura a Codecov si está disponible usando `CODECOV_TOKEN`.

## Notas útiles

- Si un cambio solo afecta un subconjunto de proyectos, `nx affected` evita ejecutar tests/build innecesarios.
- Use `nx graph` para visualizar dependencias entre proyectos.
- `pnpm test` ejecuta todos los tests del monorepo en un solo comando.
