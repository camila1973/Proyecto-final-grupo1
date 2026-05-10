// Returns the original client IP for audit logging.
//
// `@Ip()` (Express `req.ip`) only reflects `x-forwarded-for` when the app has
// `trust proxy` configured — which it doesn't, since the api-gateway is not
// the only entry point and we don't want to trust arbitrary proxy headers
// blindly. Booking-service explicitly forwards the caller's IP via
// `x-forwarded-for` when invoking our refund endpoint, so we read it here
// and fall back to `req.ip` when no header is present.
//
// The header can be a comma-separated chain (`client, proxy1, proxy2`); the
// left-most entry is the original client.
export function resolveClientIp(
  forwardedFor: string | undefined,
  directIp: string | undefined,
): string | null {
  const fromHeader = forwardedFor?.split(",")[0]?.trim();
  return fromHeader || directIp || null;
}
