import { Platform } from 'react-native';

// Android emulator reaches the host via 10.0.2.2; iOS simulator (and jest's
// node env, where Platform is undefined) uses localhost.
const fallback = Platform?.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? fallback;

console.log('[API] resolved API_BASE =', API_BASE, 'Platform.OS =', Platform?.OS);
