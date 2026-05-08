import {
  __testing,
  createQueryClient,
  setLocationApiForTests,
} from './queryClient';

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
  let navigate: jest.Mock;
  let pathname: jest.Mock;

  beforeEach(() => {
    localStorage.setItem('auth_token', 'tok');
    localStorage.setItem('auth_user', JSON.stringify({ id: 'u1' }));
    navigate = jest.fn();
    pathname = jest.fn().mockReturnValue('/booking');
    setLocationApiForTests({
      navigate,
      pathname: () => pathname() as string,
    });
  });

  afterEach(() => {
    localStorage.clear();
    setLocationApiForTests(null);
  });

  it('clears auth storage and redirects to /login on 401', () => {
    handleAuthError(new Error('HTTP 401'));
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('does nothing on non-401 errors', () => {
    handleAuthError(new Error('HTTP 500'));
    expect(localStorage.getItem('auth_token')).toBe('tok');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not redirect again when already on /login', () => {
    pathname.mockReturnValue('/login');
    handleAuthError({ status: 401 });
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('createQueryClient', () => {
  it('returns a configured QueryClient', () => {
    const client = createQueryClient();
    expect(client.getQueryCache()).toBeDefined();
    expect(client.getMutationCache()).toBeDefined();
  });
});
