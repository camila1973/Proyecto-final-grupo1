# Setup local del proyecto

Este documento describe cómo preparar el entorno y levantar el proyecto localmente.

## Requisitos mínimos

- Node.js 24.x
- pnpm 10.x
- Git
- Para mobile: Expo CLI y un emulador iOS/Android o Expo Go en un dispositivo físico.
- Opcional: Docker y Docker Compose para levantar dependencias locales.

## Clonar el repositorio

```bash
git clone <repo-url>
cd Proyecto-final-grupo1
```

## Instalar dependencias

```bash
pnpm install
```

## Levantar la aplicación completa localmente

```bash
pnpm start
```

Esto ejecuta `nx run-many -t serve` y levanta todos los servicios y el frontend en modo de desarrollo.

## Despliegue local a GCP

Si necesitas desplegar desde tu máquina a un proyecto GCP nuevo, usa la guía de Quickstart y el helper de configuración:

- [docs/quickstart-deploy.md](quickstart-deploy.md)
- `scripts/pulumi-config.sh`

El flujo típico es:

```bash
cd pulumi
pulumi stack init prod
bash ../scripts/pulumi-config.sh prod
pulumi up --stack prod --yes
```

Asegúrate de haber iniciado sesión con `gcloud auth login` y de haber configurado el proyecto correcto con `gcloud config set project <GCP_PROJECT_ID>`.

## Levantar servicios individuales

```bash
pnpm run serve:api-gateway
pnpm run serve:auth
pnpm run serve:search
pnpm run serve:inventory
pnpm run serve:booking
pnpm run serve:payment
pnpm run serve:notification
pnpm run serve:partners
pnpm run serve:integration
pnpm run serve:frontend
```

## Mobile

```bash
pnpm run start:mobile
```

En macOS puedes lanzar directamente:

```bash
pnpm run run:ios
```

En Android:

```bash
pnpm run run:android
```

## Build local

Compilar todos los proyectos:

```bash
pnpm run build
```

Compilar solo los servicios:

```bash
pnpm run build:services
```

Compilar solo el frontend:

```bash
pnpm run build:frontend
```

## Pruebas y lint

```bash
pnpm test
pnpm run lint
pnpm run lint:fix
```

Comandos de Nx afectados:

```bash
pnpm run affected:build
pnpm run affected:test
pnpm run affected:lint
```

## Docker (opcional)

Si deseas levantar el proyecto con Docker para desarrollo:

```bash
pnpm run docker:dev
```

Para detener los contenedores locales:

```bash
pnpm run docker:down
```

## Notas para mobile

- Use `npx expo install <paquete>` cuando agregue nuevas dependencias de Expo/React Native.
- Si el emulador no arranca, valide que el SDK de Android o Xcode estén configurados correctamente.
- El servidor Expo se ofrece en `http://localhost:8081`.
