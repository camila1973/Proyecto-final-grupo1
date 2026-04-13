import { MD3LightTheme } from 'react-native-paper';

/**
 * Tema compartido con el frontend web (MUI):
 *   primary  → #3a608f
 *   secondary (accent) → #e8c84a
 */
export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#3a608f',
    onPrimary: '#ffffff',
    primaryContainer: '#d0e4ff',
    onPrimaryContainer: '#001d36',
    secondary: '#e8c84a',
    onSecondary: '#1a1a1a',
    secondaryContainer: '#fef9e7',
    onSecondaryContainer: '#1a1a1a',
    background: '#f8f9ff',
    onBackground: '#111827',
    surface: '#ffffff',
    onSurface: '#111827',
    surfaceVariant: '#eef2f8',
    onSurfaceVariant: '#4a5568',
    outline: '#d1d5db',
    error: '#dc2626',
    onError: '#ffffff',
  },
};

export type AppTheme = typeof paperTheme;
