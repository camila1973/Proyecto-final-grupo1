import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import 'react-native-reanimated';
import { PaperProvider } from 'react-native-paper';
import '@/i18n';

import { AnimatedSplash } from '@/components/animated-splash';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { paperTheme } from '@/constants/paper-theme';

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
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="register-success" options={{ headerShown: false }} />
          <Stack.Screen name="search-results" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
      {!splashDone && (
        <AnimatedSplash appReady={appReady} onAnimationEnd={handleSplashEnd} />
      )}
    </PaperProvider>
  );
}
