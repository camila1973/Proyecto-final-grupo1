const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface LoginChallengeResponse {
  mfaRequired: true;
  challengeId: string;
  challengeType: 'email_otp';
  expiresIn: number;
  user: AuthUser;
}

export interface LoginTokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}

export class AuthApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

export async function initiateLogin(
  email: string,
  password: string,
): Promise<LoginChallengeResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new AuthApiError(res.status, `Login failed: ${res.status}`);
  }

  return res.json() as Promise<LoginChallengeResponse>;
}

export async function verifyMfaCode(
  challengeId: string,
  code: string,
): Promise<LoginTokenResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login/mfa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, code }),
  });

  if (!res.ok) {
    throw new AuthApiError(res.status, `MFA verification failed: ${res.status}`);
  }

  return res.json() as Promise<LoginTokenResponse>;
}
