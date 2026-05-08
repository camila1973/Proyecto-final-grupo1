const DEV_FALLBACK_SECRET = "travelhub-dev-jwt-secret-change-me";

let warned = false;

export function getJwtSecret(): string {
  const secret = process.env["AUTH_JWT_SECRET"];
  if (secret && secret.length > 0) return secret;
  if (!warned) {
    console.warn(
      "[api-gateway] AUTH_JWT_SECRET not set; using insecure dev fallback",
    );
    warned = true;
  }
  return DEV_FALLBACK_SECRET;
}
