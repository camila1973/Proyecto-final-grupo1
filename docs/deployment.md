# Despliegue

Este proyecto usa Pulumi para la infraestructura y GitHub Actions para el despliegue.

> El documento completo de despliegue está en `DEPLOYMENT.md`.

## Resumen de la infraestructura

- Cloud Run para los 9 microservicios
- Cloud SQL para PostgreSQL
- Memorystore para Redis
- Pub/Sub para eventos en producción
- Cloud Storage para el frontend
- Secret Manager para secretos
- Pulumi state en un bucket GCS

## Flujo de despliegue

### GitHub Actions

El workflow `deploy.yml` se ejecuta cuando:

- se completa el workflow `CI` en la rama `main`
- se ejecuta manualmente con `workflow_dispatch`

El workflow tiene tres caminos:

1. `deploy-infra` — Si cambian archivos en `pulumi/` o se fuerza manualmente.
2. `deploy-services` — Si cambian servicios NestJS pero no la infraestructura.
3. `deploy-frontend` — Si cambia solo el frontend.

### Qué hace `deploy-infra`

- Instala dependencias de `pulumi/`
- Autentica con Google Cloud usando `GCP_SA_KEY`
- Configura Docker para Artifact Registry
- Ejecuta `pulumi up` con la pila apuntando a GCP
- Despliega el frontend con `pnpm run deploy:frontend`

### Qué hace `deploy-services`

- Construye y sube imágenes Docker de los servicios afectados
- Usa `gcloud run deploy` para actualizar los servicios Cloud Run correspondientes

### Qué hace `deploy-frontend`

- Compila el frontend
- Sincroniza los archivos de `dist/frontend/` con el bucket de Cloud Storage

## Comandos locales de infraestructura

```bash
pnpm run infra:install
pnpm run infra:preview
pnpm run infra:up
pnpm run infra:down
pnpm run deploy:frontend
```

## Script de frontend

El frontend se despliega con `scripts/deploy-frontend.mjs`, que:

- obtiene `frontendBucket`, `gatewayUrl` y `stripePublishableKey` desde Pulumi
- compila el frontend con las variables correctas
- sincroniza los archivos a Cloud Storage

## Secretos importantes

La configuración de despliegue requiere secretos de GitHub Actions, como:

- `GCP_SA_KEY`
- `GCP_PROJECT_ID`
- `PULUMI_CONFIG_PASSPHRASE`
- `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`
- `AUTH_JWT_SECRET`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

## Nota de plataforma

La infraestructura actual está definida para Google Cloud Platform, no para AWS.

## Enlaces útiles

- `DEPLOYMENT.md`
- `pulumi/Pulumi.yaml`
- `.github/workflows/deploy.yml`
- `scripts/deploy-frontend.mjs`
