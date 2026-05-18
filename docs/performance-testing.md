# Performance testing

Esta guía describe cómo ejecutar pruebas de carga y smoke para TravelHub.

## Qué cubre

El repositorio tiene un workflow manual de GitHub Actions en `.github/workflows/performance-testing.yml` que usa `k6` para:

- smoke test de búsqueda (`smoke/search`)
- smoke test de booking (`smoke/booking`)
- test de carga de búsqueda (`load/search`)

## Workflow de GitHub Actions

`performance-testing.yml` tiene estos inputs:

- `profile` — `smoke`, `load`, `all`
- `gateway_url` — URL del API Gateway desplegado (opcional). Si no se pasa, usa la variable de repositorio `GATEWAY_URL`.

Perfiles disponibles:

- `smoke` — ejecuta `scenarios/smoke/search.js` y `scenarios/smoke/booking.js`
- `load` — ejecuta `scenarios/load/search.js`
- `all` — ejecuta smoke + load

Los resultados se suben como artefactos del workflow desde `performance-tests/results/`.

## Comandos locales

Desde el directorio `performance-tests/` puedes ejecutar directamente los tests de k6:

```bash
cd performance-tests
npm install
npm run test:load:search
```

Para ejecutar todas las pruebas smoke y carga:

```bash
npm run test:all
```

Para ejecutar solo las pruebas smoke:

```bash
npm run test:smoke:all
```

## Variables de entorno

Los scripts de `performance-tests/` esperan que `GATEWAY_URL` apunte al API Gateway activo:

```bash
GATEWAY_URL=http://localhost:3000 npm run test:load:search
```

## Notas

- `test:load:search` genera `results/results-search-load.json` y un reporte HTML en `results/summary-search-load.html`.
- Las pruebas de carga son especialmente útiles para validar la capacidad del API Gateway y del servicio de búsqueda bajo trafico sostenido.
- Asegúrate de tener un entorno estable antes de ejecutar `load` para evitar resultados no representativos.
