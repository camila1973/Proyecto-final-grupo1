import { Colors, Fonts } from './theme';

jest.mock('react-native', () => ({
  Platform: {
    select: (options: Record<string, unknown>) =>
      options['default'] ?? options['web'],
  },
}));

describe('Colors', () => {
  it('has light and dark themes', () => {
    expect(Colors.light).toBeDefined();
    expect(Colors.dark).toBeDefined();
  });

  it('light theme has all required keys', () => {
    expect(Colors.light).toMatchObject({
      text: expect.any(String),
      background: expect.any(String),
      tint: expect.any(String),
      icon: expect.any(String),
      tabIconDefault: expect.any(String),
      tabIconSelected: expect.any(String),
    });
  });

  it('dark theme has all required keys', () => {
    expect(Colors.dark).toMatchObject({
      text: expect.any(String),
      background: expect.any(String),
      tint: expect.any(String),
      icon: expect.any(String),
      tabIconDefault: expect.any(String),
      tabIconSelected: expect.any(String),
    });
  });

  it('light and dark themes have distinct tint colors', () => {
    expect(Colors.light.tint).not.toBe(Colors.dark.tint);
  });

  it('light and dark themes have distinct background colors', () => {
    expect(Colors.light.background).not.toBe(Colors.dark.background);
  });
});

describe('Fonts', () => {
  it('is defined', () => {
    expect(Fonts).toBeDefined();
  });

  it('has font family values', () => {
    expect(Fonts).toMatchObject({
      sans: expect.any(String),
      serif: expect.any(String),
      mono: expect.any(String),
    });
  });
});
