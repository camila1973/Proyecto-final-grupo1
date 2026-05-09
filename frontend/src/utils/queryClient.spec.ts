import { __testing, createQueryClient } from './queryClient';
import { setOnUnauthorizedHandler } from './authBridge';

const { isUnauthorized, handleAuthError } = __testing;

describe('isUnauthorized', () => {
  it('matches errors with status 401', () => {
    expect(isUnauthorized({ status: 401 })).toBe(true);
  });

  it('matches Error instances whose message contains 401', () => {
    expect(isUnauthorized(new Error('HTTP 401'))).toBe(true);
  });

  it('does not match other 4xx errors', () => {
    expect(isUnauthorized(new Error('HTTP 403'))).toBe(false);
    expect(isUnauthorized({ status: 404 })).toBe(false);
  });

  it('does not match non-error values', () => {
    expect(isUnauthorized(null)).toBe(false);
    expect(isUnauthorized(undefined)).toBe(false);
    expect(isUnauthorized('HTTP 401')).toBe(false);
  });

  it('does not match 401 as a substring of an unrelated number', () => {
    expect(isUnauthorized(new Error('HTTP 4011'))).toBe(false);
  });
});

describe('handleAuthError', () => {
  let onUnauthorized: jest.Mock;

  beforeEach(() => {
    onUnauthorized = jest.fn();
    setOnUnauthorizedHandler(onUnauthorized);
  });

  afterEach(() => {
    setOnUnauthorizedHandler(null);
  });

  it('triggers the unauthorized handler on 401', () => {
    handleAuthError(new Error('HTTP 401'));
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('triggers the handler when given a status: 401 object', () => {
    handleAuthError({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does nothing on non-401 errors', () => {
    handleAuthError(new Error('HTTP 500'));
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not throw when no handler is registered', () => {
    setOnUnauthorizedHandler(null);
    expect(() => handleAuthError(new Error('HTTP 401'))).not.toThrow();
  });
});

describe('createQueryClient', () => {
  it('returns a configured QueryClient', () => {
    const client = createQueryClient();
    expect(client.getQueryCache()).toBeDefined();
    expect(client.getMutationCache()).toBeDefined();
  });
});
