import { initiateLogin, verifyMfaCode, AuthApiError } from './auth-api';

const API_BASE = 'http://localhost:3000';

// ─── fetch mock helpers ────────────────────────────────────────────────────────

function mockFetchOk(body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response);
}

function mockFetchError(status: number) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ message: 'error' }),
  } as Response);
}

function mockFetchThrows() {
  global.fetch = jest.fn().mockRejectedValue(new Error('network error'));
}

function capturedRequest(): { url: string; init: RequestInit } {
  const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
  return { url, init };
}

// ─── fixtures ─────────────────────────────────────────────────────────────────

const CHALLENGE_RESPONSE = {
  mfaRequired: true as const,
  challengeId: 'challenge-abc',
  challengeType: 'email_otp' as const,
  expiresIn: 300,
  user: { id: 'usr-1', email: 'guest@travelhub.com', role: 'guest' },
};

const TOKEN_RESPONSE = {
  accessToken: 'eyJhbGciOiJIUzI1NiJ9.token',
  tokenType: 'Bearer' as const,
  expiresIn: 3600,
  user: { id: 'usr-1', email: 'guest@travelhub.com', role: 'guest' },
};

// ─── initiateLogin ────────────────────────────────────────────────────────────

describe('initiateLogin', () => {
  afterEach(() => jest.resetAllMocks());

  it('POSTs to /api/auth/login', async () => {
    mockFetchOk(CHALLENGE_RESPONSE);
    await initiateLogin('guest@travelhub.com', 'Guest1234!');
    expect(capturedRequest().url).toBe(`${API_BASE}/api/auth/login`);
    expect(capturedRequest().init.method).toBe('POST');
  });

  it('sends email and password as JSON body', async () => {
    mockFetchOk(CHALLENGE_RESPONSE);
    await initiateLogin('guest@travelhub.com', 'Guest1234!');
    expect(JSON.parse(capturedRequest().init.body as string)).toEqual({
      email: 'guest@travelhub.com',
      password: 'Guest1234!',
    });
  });

  it('sets Content-Type: application/json', async () => {
    mockFetchOk(CHALLENGE_RESPONSE);
    await initiateLogin('guest@travelhub.com', 'Guest1234!');
    expect((capturedRequest().init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('returns the challenge response on success', async () => {
    mockFetchOk(CHALLENGE_RESPONSE);
    const result = await initiateLogin('guest@travelhub.com', 'Guest1234!');
    expect(result).toEqual(CHALLENGE_RESPONSE);
  });

  it('throws AuthApiError with status 401 on invalid credentials', async () => {
    mockFetchError(401);
    await expect(initiateLogin('guest@travelhub.com', 'wrong')).rejects.toThrow(AuthApiError);
    await expect(initiateLogin('guest@travelhub.com', 'wrong')).rejects.toMatchObject({ status: 401 });
  });

  it('throws AuthApiError with status 400 on bad request', async () => {
    mockFetchError(400);
    await expect(initiateLogin('not-an-email', '')).rejects.toThrow(AuthApiError);
    await expect(initiateLogin('not-an-email', '')).rejects.toMatchObject({ status: 400 });
  });

  it('throws AuthApiError with status 500 on server error', async () => {
    mockFetchError(500);
    await expect(initiateLogin('guest@travelhub.com', 'Guest1234!')).rejects.toMatchObject({ status: 500 });
  });

  it('propagates network errors', async () => {
    mockFetchThrows();
    await expect(initiateLogin('guest@travelhub.com', 'Guest1234!')).rejects.toThrow('network error');
  });
});

// ─── verifyMfaCode ────────────────────────────────────────────────────────────

describe('verifyMfaCode', () => {
  afterEach(() => jest.resetAllMocks());

  it('POSTs to /api/auth/login/mfa', async () => {
    mockFetchOk(TOKEN_RESPONSE);
    await verifyMfaCode('challenge-abc', '123456');
    expect(capturedRequest().url).toBe(`${API_BASE}/api/auth/login/mfa`);
    expect(capturedRequest().init.method).toBe('POST');
  });

  it('sends challengeId and code as JSON body', async () => {
    mockFetchOk(TOKEN_RESPONSE);
    await verifyMfaCode('challenge-abc', '123456');
    expect(JSON.parse(capturedRequest().init.body as string)).toEqual({
      challengeId: 'challenge-abc',
      code: '123456',
    });
  });

  it('sets Content-Type: application/json', async () => {
    mockFetchOk(TOKEN_RESPONSE);
    await verifyMfaCode('challenge-abc', '123456');
    expect((capturedRequest().init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('returns the token response on success', async () => {
    mockFetchOk(TOKEN_RESPONSE);
    const result = await verifyMfaCode('challenge-abc', '123456');
    expect(result).toEqual(TOKEN_RESPONSE);
  });

  it('throws AuthApiError with status 401 on invalid or expired code', async () => {
    mockFetchError(401);
    await expect(verifyMfaCode('challenge-abc', '000000')).rejects.toThrow(AuthApiError);
    await expect(verifyMfaCode('challenge-abc', '000000')).rejects.toMatchObject({ status: 401 });
  });

  it('throws AuthApiError with status 500 on server error', async () => {
    mockFetchError(500);
    await expect(verifyMfaCode('challenge-abc', '123456')).rejects.toMatchObject({ status: 500 });
  });

  it('propagates network errors', async () => {
    mockFetchThrows();
    await expect(verifyMfaCode('challenge-abc', '123456')).rejects.toThrow('network error');
  });
});

// ─── AuthApiError ─────────────────────────────────────────────────────────────

describe('AuthApiError', () => {
  it('exposes the status code', () => {
    const err = new AuthApiError(401, 'Unauthorized');
    expect(err.status).toBe(401);
  });

  it('sets the error name', () => {
    const err = new AuthApiError(401, 'Unauthorized');
    expect(err.name).toBe('AuthApiError');
  });

  it('is an instance of Error', () => {
    expect(new AuthApiError(500, 'Server error')).toBeInstanceOf(Error);
  });
});
