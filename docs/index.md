# TravelHub — Documentation Index

Esta carpeta contiene la documentación técnica y de operaciones para comprender, ejecutar y desplegar TravelHub.

Contenido (orden recomendado):

1. Quickstart
   - [Quickstart: Deploy rápido](quickstart-deploy.md)
2. Setup
   - [Setup local](setup.md)
3. Deployment
   - [Deployment (Pulumi + GCP)](deployment.md)
   - [Pulumi reference](pulumi/README.md)
4. Architecture
   - [Arquitectura y servicios](architecture.md)
5. CI & Testing
   - [CI y testing](ci-and-testing.md)
   - [Performance testing](performance-testing.md)
6. Services
   - [integration-service](integration-service.md)
   - Otros servicios: `services/<name>` (por crear)
7. Runbooks & Ops
   - `runbooks/` (checklists, rollback, verificación)
8. Security & Secrets
   - `secrets.md` (mapa de secretos y prácticas)
9. Troubleshooting
   - `troubleshooting.md`

Cómo usar este índice:
- Empieza por el `Quickstart` si necesitas desplegar rápido en `prod`.
- Abre `Setup` para preparar una máquina de desarrollo.
- Consulta `Deployment` y `Pulumi reference` para cambios en infraestructura.

Si falta una página aquí, abre una issue o crea un PR con la nueva doc bajo `docs/`.
