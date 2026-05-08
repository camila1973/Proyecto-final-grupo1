import {
  MutationCache,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
const LOGIN_PATH = '/login';

interface LocationApi {
  pathname(): string;
  navigate(path: string): void;
}

const browserLocation: LocationApi = {
  pathname: () =>
    typeof window === 'undefined' ? '' : window.location.pathname,
  navigate: (path) => {
    if (typeof window !== 'undefined') window.location.assign(path);
  },
};

let locationApi: LocationApi = browserLocation;

export function setLocationApiForTests(api: LocationApi | null): void {
  locationApi = api ?? browserLocation;
}

function isUnauthorized(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const status = (err as { status?: unknown }).status;
  if (status === 401) return true;
  const message = (err as { message?: unknown }).message;
  return typeof message === 'string' && /\b401\b/.test(message);
}

function handleAuthError(err: unknown): void {
  if (!isUnauthorized(err)) return;
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  if (!locationApi.pathname().startsWith(LOGIN_PATH)) {
    locationApi.navigate(LOGIN_PATH);
  }
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleAuthError }),
    mutationCache: new MutationCache({ onError: handleAuthError }),
  });
}

export const __testing = { isUnauthorized, handleAuthError };
