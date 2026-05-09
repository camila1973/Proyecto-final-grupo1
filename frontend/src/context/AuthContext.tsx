import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AuthContext } from './auth-context';
import type { AuthUser } from './auth-context';
import { setOnUnauthorizedHandler } from '../utils/authBridge';

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
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const logoutRef = useRef(logout);

  useEffect(() => {
    navigateRef.current = navigate;
    logoutRef.current = logout;
  });

  useEffect(() => {
    setOnUnauthorizedHandler(() => {
      logoutRef.current();
      void navigateRef.current({ to: '/login' });
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
    setState({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      <AuthBridgeBinder logout={logout} />
      {children}
    </AuthContext.Provider>
  );
}
