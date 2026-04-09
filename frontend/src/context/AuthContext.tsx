import { useState } from 'react';
import { AuthContext } from './auth-context';
import type { AuthUser } from './auth-context';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(loadFromStorage);

  const login = (token: string, user: AuthUser) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setState({ token, user });
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setState({ token: null, user: null });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
