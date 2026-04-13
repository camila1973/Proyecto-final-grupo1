// react-native-paper usa ESM internamente; lo mockeamos para que Jest pueda
// importar paper-theme.ts sin necesitar transformar node_modules.
import { paperTheme } from './paper-theme';

jest.mock('react-native-paper', () => ({
  MD3LightTheme: {
    colors: {
      primary: '#6750a4',
      onPrimary: '#ffffff',
      primaryContainer: '#eaddff',
      onPrimaryContainer: '#21005d',
      secondary: '#625b71',
      onSecondary: '#ffffff',
      secondaryContainer: '#e8def8',
      onSecondaryContainer: '#1d192b',
      background: '#fffbfe',
      onBackground: '#1c1b1f',
      surface: '#fffbfe',
      onSurface: '#1c1b1f',
      surfaceVariant: '#e7e0ec',
      onSurfaceVariant: '#49454f',
      outline: '#79747e',
      error: '#b3261e',
      onError: '#ffffff',
    },
  },
}));

/**
 * Verifica que el tema de React Native Paper mantenga consistencia
 * con los tokens del tema MUI del frontend:
 *   primary    → #3a608f
 *   secondary  → #e8c84a
 *   background → #f8f9ff
 */
describe('paperTheme', () => {
  it('is defined', () => {
    expect(paperTheme).toBeDefined();
  });

  it('has a colors object', () => {
    expect(paperTheme.colors).toBeDefined();
  });

  // ── Consistencia con el frontend MUI ──────────────────────────────────────

  it('primary color matches the MUI frontend theme (#3a608f)', () => {
    expect(paperTheme.colors.primary).toBe('#3a608f');
  });

  it('secondary color matches the MUI frontend accent (#e8c84a)', () => {
    expect(paperTheme.colors.secondary).toBe('#e8c84a');
  });

  it('background color matches the MUI frontend background (#f8f9ff)', () => {
    expect(paperTheme.colors.background).toBe('#f8f9ff');
  });

  // ── Tokens de contraste ────────────────────────────────────────────────────

  it('onPrimary is white so text is readable on primary background', () => {
    expect(paperTheme.colors.onPrimary).toBe('#ffffff');
  });

  it('surface is white', () => {
    expect(paperTheme.colors.surface).toBe('#ffffff');
  });

  it('error color is defined', () => {
    expect(paperTheme.colors.error).toBeDefined();
  });

  // ── Tokens requeridos por los componentes Paper ────────────────────────────

  it('has primaryContainer color', () => {
    expect(paperTheme.colors.primaryContainer).toBeDefined();
  });

  it('has onSurfaceVariant color', () => {
    expect(paperTheme.colors.onSurfaceVariant).toBeDefined();
  });

  it('has outline color', () => {
    expect(paperTheme.colors.outline).toBeDefined();
  });

  it('has surfaceVariant color', () => {
    expect(paperTheme.colors.surfaceVariant).toBeDefined();
  });
});
