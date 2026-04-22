import React from 'react';
import { useAuth } from './useAuth';
import { AuthContext } from '@/context/auth-context';
import type { AuthContextValue } from '@/context/auth-context';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@/services/auth-api', () => ({
  initiateLogin: jest.fn(),
  verifyMfaCode: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  TOKEN_KEY: '@auth_token',
  USER_KEY: '@auth_user',
}));

/* Mock react so we can control useContext */
const originalUseContext = React.useContext;

afterEach(() => {
  React.useContext = originalUseContext;
});

describe('useAuth', () => {
  it('returns context value when context is provided', () => {
    const value: AuthContextValue = {
      token: 'tok',
      user: { id: '1', email: 'a@b.com', role: 'guest' },
      isLoading: false,
      setToken: jest.fn(),
      setUser: jest.fn(),
    };

    jest.spyOn(React, 'useContext').mockReturnValue(value);

    const result = useAuth();
    expect(result.token).toBe('tok');
    expect(result.user?.email).toBe('a@b.com');
    expect(React.useContext).toHaveBeenCalledWith(AuthContext);
  });

  it('throws when used outside AuthProvider', () => {
    jest.spyOn(React, 'useContext').mockReturnValue(null);

    expect(() => useAuth()).toThrow('useAuth must be used inside AuthProvider');
  });
});
