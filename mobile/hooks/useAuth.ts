import { useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '@/context/auth-context';
import type { SignInResult } from '@/context/auth-context';
import { TOKEN_KEY, USER_KEY } from '@/context/AuthContext';
import { initiateLogin, verifyMfaCode } from '@/services/auth-api';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');

  const login = async (email: string, password: string): Promise<SignInResult> => {
    const result = await initiateLogin(email, password);
    return { challengeId: result.challengeId, email: result.user.email };
  };

  const verifyMfa = async (challengeId: string, code: string): Promise<void> => {
    const result = await verifyMfaCode(challengeId, code);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, result.accessToken),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(result.user)),
    ]);
    ctx.setToken(result.accessToken);
    ctx.setUser(result.user);
  };

  const logout = async (): Promise<void> => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    ctx.setToken(null);
    ctx.setUser(null);
  };

  return {
    token: ctx.token,
    user: ctx.user,
    isLoading: ctx.isLoading,
    login,
    verifyMfa,
    logout,
  };
}
