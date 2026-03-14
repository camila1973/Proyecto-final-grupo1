import { Colors } from '@/constants/theme';
import { useThemeColor } from './use-theme-color';

jest.mock('react-native', () => ({
  Platform: {
    select: (options: Record<string, unknown>) =>
      options['default'] ?? options['web'],
  },
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn().mockReturnValue('light'),
}));

const mockUseColorScheme = jest.requireMock('@/hooks/use-color-scheme').useColorScheme as jest.Mock;

describe('useThemeColor', () => {
  beforeEach(() => {
    mockUseColorScheme.mockReturnValue('light');
  });

  it('returns the light prop color when in light mode', () => {
    const result = useThemeColor({ light: '#custom-light', dark: '#custom-dark' }, 'text');
    expect(result).toBe('#custom-light');
  });

  it('returns the dark prop color when in dark mode', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const result = useThemeColor({ light: '#custom-light', dark: '#custom-dark' }, 'text');
    expect(result).toBe('#custom-dark');
  });

  it('falls back to Colors.light when no light prop is provided', () => {
    const result = useThemeColor({}, 'text');
    expect(result).toBe(Colors.light.text);
  });

  it('falls back to Colors.dark when no dark prop is provided and in dark mode', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const result = useThemeColor({}, 'background');
    expect(result).toBe(Colors.dark.background);
  });

  it('falls back to Colors.light when useColorScheme returns null', () => {
    mockUseColorScheme.mockReturnValue(null);
    const result = useThemeColor({}, 'tint');
    expect(result).toBe(Colors.light.tint);
  });
});
