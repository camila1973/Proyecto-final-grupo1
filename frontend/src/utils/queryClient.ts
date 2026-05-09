import {
  MutationCache,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query';
import { triggerOnUnauthorized } from './authBridge';

function isUnauthorized(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const status = (err as { status?: unknown }).status;
  if (status === 401) return true;
  const message = (err as { message?: unknown }).message;
  return typeof message === 'string' && /\b401\b/.test(message);
}

function handleAuthError(err: unknown): void {
  if (!isUnauthorized(err)) return;
  triggerOnUnauthorized();
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleAuthError }),
    mutationCache: new MutationCache({ onError: handleAuthError }),
  });
}

export const __testing = { isUnauthorized, handleAuthError };
