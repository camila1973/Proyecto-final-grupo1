import { createContext } from 'react';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
};

export type SignInResult =
  | { mfaRequired: true; challengeId: string; email: string }
  | { mfaRequired: false };

// Internal context — raw state + setters. Business logic lives in useAuth.
// Public API (signIn, completeSignIn, logout) is assembled by the hook.
export type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
