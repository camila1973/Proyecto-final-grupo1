# Docker — Rebuilding Images

Service images are built on top of `travelhub-base` (`docker/Dockerfile.base`), which runs `pnpm install` from the root `package.json` + `pnpm-lock.yaml`. **Whenever a new root dependency is added** (e.g. `@nestjs/schedule`), the base image must be rebuilt first or `docker compose build` will fail with `Cannot find module`:

```bash
# 1. Rebuild base image (picks up new root dependencies)
docker build --no-cache -t travelhub-base -f docker/Dockerfile.base .

# 2. Rebuild all service images
docker compose build --parallel

# 3. Start
docker compose up -d
```

If only application code changed (no new dependencies), skip step 1 — `docker compose build --parallel` is enough.
