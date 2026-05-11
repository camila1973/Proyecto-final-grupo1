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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AsyncStorage = require('@react-native-async-storage/async-storage');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { initiateLogin, verifyMfaCode } = require('@/services/auth-api');

function makeCtx(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    token: null,
    user: null,
    isLoading: false,
    setToken: jest.fn(),
    setUser: jest.fn(),
    ...overrides,
  };
}

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

  describe('login', () => {
    it('returns MFA challenge info when the backend requires MFA', async () => {
      jest.spyOn(React, 'useContext').mockReturnValue(makeCtx());
      (initiateLogin as jest.Mock).mockResolvedValue({
        mfaRequired: true,
        challengeId: 'ch-1',
        user: { email: 'test@example.com' },
      });

      const { login } = useAuth();
      const result = await login('test@example.com', 'secret');

      expect(initiateLogin).toHaveBeenCalledWith('test@example.com', 'secret');
      expect(result).toEqual({
        mfaRequired: true,
        challengeId: 'ch-1',
        email: 'test@example.com',
      });
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('persists token + user when backend returns accessToken (MFA bypass)', async () => {
      const ctx = makeCtx();
      jest.spyOn(React, 'useContext').mockReturnValue(ctx);
      const mockUser = { id: 'u-9', email: 'e2e@travelhub.com', role: 'guest' };
      (initiateLogin as jest.Mock).mockResolvedValue({
        accessToken: 'jwt-bypass',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: mockUser,
      });

      const { login } = useAuth();
      const result = await login('e2e@travelhub.com', 'E2eTest1234!');

      expect(result).toEqual({ mfaRequired: false });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@auth_token', 'jwt-bypass');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@auth_user', JSON.stringify(mockUser));
      expect(ctx.setToken).toHaveBeenCalledWith('jwt-bypass');
      expect(ctx.setUser).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('verifyMfa', () => {
    it('stores token + user in AsyncStorage and updates context', async () => {
      const ctx = makeCtx();
      jest.spyOn(React, 'useContext').mockReturnValue(ctx);

      const mockUser = { id: 'u-1', email: 'test@example.com', role: 'guest' };
      (verifyMfaCode as jest.Mock).mockResolvedValue({
        accessToken: 'jwt-abc',
        user: mockUser,
      });

      const { verifyMfa } = useAuth();
      await verifyMfa('ch-1', '123456');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@auth_token', 'jwt-abc');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@auth_user', JSON.stringify(mockUser));
      expect(ctx.setToken).toHaveBeenCalledWith('jwt-abc');
      expect(ctx.setUser).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('logout', () => {
    it('removes token + user from AsyncStorage and clears context', async () => {
      const ctx = makeCtx({ token: 'existing-token' });
      jest.spyOn(React, 'useContext').mockReturnValue(ctx);

      const { logout } = useAuth();
      await logout();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@auth_token');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@auth_user');
      expect(ctx.setToken).toHaveBeenCalledWith(null);
      expect(ctx.setUser).toHaveBeenCalledWith(null);
    });
  });
});
