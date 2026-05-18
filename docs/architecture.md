# Arquitectura del proyecto

TravelHub es un monorepo Nx que agrupa:

- 9 microservicios NestJS bajo `services/`
- Una aplicación web React en `frontend/`
- Una aplicación móvil Expo + React Native en `mobile/`

## Visión general

```
/ (raíz del monorepo)
├── services/          # microservicios NestJS
├── frontend/          # SPA React + Vite
├── mobile/            # Expo / React Native
├── docs/              # documentación técnica
├── pulumi/            # infraestructura en GCP
├── scripts/           # scripts de despliegue / utilidades
└── package.json       # scripts globales y dependencias del monorepo
```

## Servicios y responsabilidades

| Servicio | Puerto local | Función principal |
|---|---|---|
| `api-gateway` | 3000 | Punto de entrada, JWT, rate limiting, reenvío de requests |
| `auth-service` | 3001 | Registro, login, JWT, MFA, RBAC |
| `search-service` | 3002 | Búsqueda de propiedades, ranking, caché|
| `inventory-service` | 3003 | Gestión de habitaciones, tarifas y disponibilidad |
| `booking-service` | 3004 | Reservas, carrito, cálculos de tarifa |
| `payment-service` | 3005 | Integración con Stripe/MercadoPago/PayPal |
| `notification-service` | 3006 | Emails y notificaciones push |
| `partners-service` | 3007 | Portal de socio/hotel, métricas y pagos |
| `integration-service` | 3008 | Webhooks PMS, importes CSV, mapeo externo |

## Flujo de solicitudes

- El frontend y la app móvil llaman a `api-gateway`.
- `api-gateway` valida JWT y reenvía cabeceras confiables (`x-user-id`, `x-user-email`, `x-user-role`, etc.) a los microservicios.
- Los microservicios no validan JWT directamente; confían en el gateway.

## Comunicación entre servicios

- Principalmente HTTP/REST entre servicios.
- También se usan eventos para sincronizar datos y notificaciones.
- Localmente el broker puede ser RabbitMQ; en producción se usa Pub/Sub de GCP.

## Frontend y mobile

- `frontend/` es una SPA React 19 con Vite 7.
- `mobile/` es una app Expo 54 con React Native 0.81.
- Ambos consumen APIs expuestas por `api-gateway`.

## Herramientas y tecnología

- Monorepo: Nx 22.5
- Backend: NestJS 11, Node.js 24
- Frontend: React 19 + Vite 7
- Mobile: Expo 54 + React Native 0.81
- Base de datos: PostgreSQL (Cloud SQL en producción)
- Cache/cola: Redis / Pub/Sub
- Infraestructura: Pulumi en `pulumi/`
- Tests: Jest + Nx
- Lint: ESLint plano + Prettier

## Cómo está organizado el código

- Cada servicio tiene su propia carpeta bajo `services/<nombre>/`.
- El entrypoint en cada servicio es `src/main.ts`.
- El frontend arranca desde `frontend/src/main.tsx`.
- La app móvil usa rutas de Expo en `mobile/app/`.

## Por qué esta arquitectura

- Separación de responsabilidades por servicio.
- Escalado independiente de frontend, mobile y backend.
- Despliegue con Pulumi facilita la infraestructura como código.
- Uso de Nx para orquestar builds, tests y lint en todo el monorepo.
