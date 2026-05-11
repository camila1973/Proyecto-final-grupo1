import { Logger } from "@nestjs/common";

const DEV_FALLBACK_SECRET = "travelhub-dev-jwt-secret-change-me";
const logger = new Logger("JwtConfig");

let warned = false;

export function getJwtSecret(): string {
  const secret = process.env["AUTH_JWT_SECRET"];
  if (secret && secret.length > 0) return secret;
  if (!warned) {
    logger.warn("AUTH_JWT_SECRET not set; using insecure dev fallback");
    warned = true;
  }
  return DEV_FALLBACK_SECRET;
}
