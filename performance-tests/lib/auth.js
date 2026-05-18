import http from "k6/http";

// Logs in via the api-gateway and returns the access token.
// The e2e seed user (e2e@travelhub.com) has mfaRequired=false, so the first
// POST /api/auth/login returns a LoginTokenResponse directly. Other users
// would require a second POST /api/auth/login/mfa step.
export function login(gatewayUrl, email, password) {
  const res = http.post(
    `${gatewayUrl}/api/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: { "Content-Type": "application/json", "X-Load-Test": "true" },
      timeout: "45s",
    },
  );

  if (res.status !== 200) {
    throw new Error(
      `Login failed for ${email}: ${res.status} ${res.body?.slice(0, 200)}`,
    );
  }

  const body = JSON.parse(res.body);
  if (body.mfaRequired) {
    throw new Error(
      `Login for ${email} returned an MFA challenge; the smoke test expects an mfaRequired=false account.`,
    );
  }
  if (!body.accessToken) {
    throw new Error(`Login for ${email} returned no accessToken`);
  }

  return body.accessToken;
}
