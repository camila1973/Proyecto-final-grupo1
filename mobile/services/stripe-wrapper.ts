/**
 * Conditional Stripe wrapper - only imports on native platforms
 * Provides mock implementation for web to allow builds
 */

import { Platform } from 'react-native';

// Only import Stripe on native platforms
 
const StripeNative = Platform.OS !== 'web' 
  ? require('@stripe/stripe-react-native')
  : null;

// For web, export mock implementations
// For native, re-export from the real module
export const useStripe = StripeNative?.useStripe ?? (() => ({
  initPaymentSheet: async () => ({ error: new Error('Stripe not supported on web') }),
  presentPaymentSheet: async () => ({ error: new Error('Stripe not supported on web') }),
}));

export const StripeProvider = StripeNative?.StripeProvider ?? (
  ({ children }: { children: React.ReactNode; publishableKey?: string }) => children
);
