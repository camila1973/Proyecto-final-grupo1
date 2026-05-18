# Quickstart — Deploy rápido (prod)

Resumen de 1 página para que un ingeniero nuevo despliegue TravelHub en la pila `prod`.

Prerequisitos locales:

- Tener `gcloud`, `pulumi`, `pnpm` y `node` instalados y autenticados.
- Acceso al proyecto GCP y permiso para crear recursos (o usar CI que tiene permisos).
- Archivo de cuenta de servicio GCP (JSON) si vas a ejecutar Pulumi localmente.

Pasos mínimos (local)

1. Clona y entra al repo:

```bash
git clone <repo-url>
cd Proyecto-final-grupo1
pnpm install
```

2. Entra a la carpeta `pulumi` y crea la pila `prod` (ejemplo):

```bash
cd pulumi
pulumi stack init prod
```

> Si vas a desplegar desde cero en otro proyecto GCP, asegúrate de usar `gcloud auth login` y el proyecto correcto:
>
> ```bash
gcloud auth login
> gcloud config set project <GCP_PROJECT_ID>
> ```
>
> Luego crea la pila con un nombre adecuado para ese proyecto, por ejemplo:
>
> ```bash
> pulumi stack init prod
> # o
> pulumi stack init <nuevo-stack>
> ```
>
3. Configura los valores requeridos (ejemplos):

```bash
# GCP
pulumi config set --stack prod gcp:project <GCP_PROJECT_ID>
pulumi config set --stack prod gcp:region <GCP_REGION>

# Secrets y claves (usar --secret para valores sensibles)
pulumi config set --secret --stack prod authJwtSecret <AUTH_JWT_SECRET>
pulumi config set --secret --stack prod stripeSecretKey <STRIPE_SECRET>
pulumi config set --secret --stack prod stripeWebhookSecret <STRIPE_WEBHOOK_SECRET>
pulumi config set --stack prod stripePublishableKey <STRIPE_PUBLISHABLE_KEY>
pulumi config set --stack prod smtpHost <SMTP_HOST>
pulumi config set --stack prod smtpUser <SMTP_USER>
pulumi config set --secret --stack prod smtpPass <SMTP_PASS>
pulumi config set --stack prod firebaseProjectId <FIREBASE_PROJECT_ID>
pulumi config set --secret --stack prod firebaseClientEmail <FIREBASE_CLIENT_EMAIL>
pulumi config set --secret --stack prod firebasePrivateKey '<FIREBASE_PRIVATE_KEY_JSON>'

# Opcional: pasar la key del service account como secret
pulumi config set --secret --stack prod gcpServiceAccountKey "$(cat service-account.json)"
```

Nota: en CI usamos GitHub Secrets y el workflow escribe estos `pulumi config set` desde los secrets — no es necesario repetirlo manualmente en CI.

4. Desplegar (probar en local con Pulumi):

```bash
pnpm --filter @travelhub/pulumi exec pulumi up --stack prod --yes
```

5. Comprobar servicios:

```bash
# Ver servicios Cloud Run
gcloud run services list --platform managed --region <GCP_REGION>

# Probar health endpoint (ejemplo, sustituir HOST por el URL de Cloud Run)
curl -fsS https://<SERVICE_HOST>/health
```

Despliegue mediante CI

- La pipeline `deploy.yml` del repo realiza build de imágenes, sube a Artifact Registry y ejecuta `pulumi up` usando los GitHub Secrets. Asegura que las Secrets listadas en `docs/deployment.md` estén añadidas en el repositorio.

Si algo falla

- Revisa `pulumi` logs y el output del workflow en GitHub Actions.
- Usa `pulumi stack output` para ver URLs y recursos creados.

### Script de configuración rápida

También puedes automatizar la creación de los valores de configuración con el helper. Si usas otro stack, pásalo como primer argumento:

```bash
bash ./scripts/pulumi-config.sh prod
# o para otro stack
bash ./scripts/pulumi-config.sh <stack-name>
```

El script usa estas variables de entorno:

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `AUTH_JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PUBLISHABLE_KEY`
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `GCP_SERVICE_ACCOUNT_KEY` o `GCP_SERVICE_ACCOUNT_KEY_FILE`

Si no quieres usar un archivo JSON, exporta `GCP_SERVICE_ACCOUNT_KEY` con el contenido del key file.
