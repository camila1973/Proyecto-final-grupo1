# Authentication — JWT at the Gateway

The **api-gateway** validates every JWT centrally and forwards trusted identity headers to downstream services. Downstream services do **not** verify JWTs — they trust the headers the gateway injects. The model is **deny-by-default**: routes are protected unless explicitly listed as public.

## Header contract (what downstream services receive)

When a request reaches a downstream service through the gateway, these headers are present **iff** the gateway successfully verified a JWT:

| Header | Source | Always set? |
|---|---|---|
| `Authorization: Bearer <token>` | Forwarded as-is | If client sent it |
| `X-User-Id` | JWT `sub` | ✅ on protected routes |
| `X-User-Email` | JWT `email` | ✅ on protected routes |
| `X-User-Role` | JWT `role` | ✅ on protected routes |
| `X-Partner-Id` | JWT `partnerId` | Only if present in token |
| `X-Property-Id` | JWT `propertyId` | Only if present in token |

The gateway **strips** any client-supplied `X-User-*` / `X-Partner-Id` / `X-Property-Id` headers before processing — clients cannot spoof identity, even on public routes.

## Adding an authenticated endpoint

**Default case — no gateway change required.** Just add the controller method in the downstream service:

```ts
@Post("reservations/:id/cancel")
cancel(@Req() req: Request, @Param("id") id: string) {
  const userId = req.headers["x-user-id"] as string;
  // ...
}
```

The gateway will require a valid JWT, inject the headers, and proxy. If the request reaches your handler, identity is verified. If you need authorization (role checks, ownership), do it in the service — the gateway only authenticates.

## Adding a public endpoint

When an endpoint must be reachable without a JWT (health check, login, webhook, public browse), add a regex to the allowlist:

**File**: `services/api-gateway/src/auth/public-routes.ts`

```ts
{ method: "POST", pattern: /^\/api\/integration\/webhooks\/[^/]+\/events\/?$/ },
```

### Rules for writing public-route regexes

- **Match the gateway path** (`/api/<service>/<rest>`), not the downstream service's internal path.
- **Pin the method** (`GET`, `POST`, `PATCH`, etc.). Don't use `"*"` unless you really mean every method.
- **Prefer narrow patterns over broad prefixes.** Broad prefixes (e.g. `^/api/search(/.*)?$`) capture every future endpoint under that prefix as public — including admin or internal routes someone might add later. When in doubt, list specific paths.
- **Add a trailing comment** explaining why the route is public (Stripe HMAC, CORS preflight, pre-login flow, etc.). Reviewers should be able to assess each entry without spelunking.

### When you're unsure if a route is public

Default to **protected**. The cost of a wrongly-protected route is a 401 the frontend will surface within seconds. The cost of a wrongly-public route is silent data exposure. Loud failure beats silent breach.

## Verification

After adding or changing routes:

```bash
# Tests — covers public routes, header injection, spoofing, alg=none, expiry, etc.
nx test api-gateway

# Local smoke
curl -i http://localhost:3000/api/<your-route>          # expect 401 if protected
curl -i http://localhost:3000/api/<your-route> \
  -H "Authorization: Bearer <valid-token>"              # expect 2xx
```

## Where the JWT secret lives

| Environment | Source | Notes |
|---|---|---|
| Local dev (`pnpm run serve:*`) | Hardcoded fallback `"travelhub-dev-jwt-secret-change-me"` | Same fallback in `auth-service` and `api-gateway` so they always match. Logs a warning at startup. |
| Local docker (`docker compose up`) | `AUTH_JWT_SECRET` env var with same fallback | Set on both `auth-service` and `api-gateway` blocks in `docker-compose.yml`. |
| Production (Cloud Run) | GCP Secret Manager → `AUTH_JWT_SECRET` env var | Wired in `pulumi/index.ts`; set the value once with `pulumi config set --secret app:authJwtSecret "$(openssl rand -base64 64)"`. |

Rotating the production secret invalidates every existing token (forced re-login). That's acceptable; the system has no graceful key-rotation support.

## Key files

| File | Role |
|---|---|
| `services/api-gateway/src/auth/jwt.verifier.ts` | Verifies signature, alg, issuer, exp via `@nestjs/jwt`. Pinned to HS256, 5s clock tolerance. |
| `services/api-gateway/src/auth/auth.middleware.ts` | Strips spoofed headers, gates public vs. protected, injects identity headers. |
| `services/api-gateway/src/auth/public-routes.ts` | The allowlist. Edit this when adding a public endpoint. |
| `services/auth-service/src/auth/auth.service.ts` | `createAccessToken()` — JWT issuance via `JwtService.sign()`. |
| `services/api-gateway/src/proxy.service.ts` | Forwards `Authorization` + `X-User-*` headers to upstream. |

## What the gateway does NOT do

- No authorization (role checks, resource ownership) — that's the downstream service's job.
- No URL/JWT consistency check (e.g., `:partnerId` in URL must match JWT's `partnerId`). Today, downstream services that care must enforce this themselves. Example: `booking-service` `check-in` endpoint compares `bookerId` to the reservation owner.
- No token revocation. Tokens are valid until `exp` (1 hour); logout is client-side. Revocation would need a Redis-backed blocklist consulted by the gateway.
