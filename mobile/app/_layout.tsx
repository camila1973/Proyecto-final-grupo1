import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import 'react-native-reanimated';
import { PaperProvider } from 'react-native-paper';
import { StripeProvider } from '@/services/stripe-wrapper';
import '@/i18n';

import { AnimatedSplash } from '@/components/animated-splash';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { paperTheme } from '@/constants/paper-theme';
import { AuthProvider } from '@/context/AuthContext';

const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appReady, setAppReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync().then(() => setAppReady(true));
  }, []);

  const handleSplashEnd = useCallback(() => setSplashDone(true), []);

  return (
    <StripeProvider publishableKey={STRIPE_PK} merchantIdentifier="merchant.com.travelhub">
    <AuthProvider>
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="search-results" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="property/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="booking/checkout" options={{ headerShown: false }} />
          <Stack.Screen name="booking/confirmation" options={{ headerShown: false }} />
          <Stack.Screen name="booking/[reservationId]/check-in" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
      {!splashDone && (
        <AnimatedSplash appReady={appReady} onAnimationEnd={handleSplashEnd} />
      )}
    </PaperProvider>
    </AuthProvider>
    </StripeProvider>
  );
}
