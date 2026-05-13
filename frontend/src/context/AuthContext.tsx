import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthContext } from './auth-context';
import type { AuthUser } from './auth-context';
import { setOnUnauthorizedHandler } from '../utils/authBridge';
import { clearCheckoutIntent } from '../hooks/useBookingFlow';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

function loadFromStorage(): AuthState {
  try {
    const token = localStorage.getItem('auth_token');
    const raw = localStorage.getItem('auth_user');
    if (token && raw) {
      return { token, user: JSON.parse(raw) as AuthUser };
    }
  } catch {
    // ignore
  }
  return { token: null, user: null };
}

function AuthBridgeBinder({ logout }: { logout: () => void }) {
  const logoutRef = useRef(logout);

  useEffect(() => {
    logoutRef.current = logout;
  });

  useEffect(() => {
    setOnUnauthorizedHandler(() => {
      logoutRef.current();
      // Full URL replace — hash router's navigate() only touches the hash, so
      // if the path is already e.g. '/login' the URL ends up '/login#/login'.
      if (typeof window !== 'undefined') {
        window.location.replace(`${window.location.origin}/#/login`);
      }
    });
    return () => setOnUnauthorizedHandler(null);
  }, []);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(loadFromStorage);

  const login = (token: string, user: AuthUser) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setState({ token, user });
  };

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    clearCheckoutIntent();
    setState({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      <AuthBridgeBinder logout={logout} />
      {children}
    </AuthContext.Provider>
  );
}
