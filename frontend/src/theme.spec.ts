import { theme } from './theme';

describe('theme', () => {
  it('exports an object', () => {
    expect(theme).toBeDefined();
    expect(typeof theme).toBe('object');
  });

  it('uses the primary brand blue', () => {
    expect(theme.palette.primary.main).toBe('#3a608f');
  });

  it('configures MuiButton to disable elevation by default', () => {
    expect(theme.components?.MuiButton?.defaultProps?.disableElevation).toBe(true);
  });

  it('configures MuiCard as outlined by default', () => {
    expect(theme.components?.MuiCard?.defaultProps?.variant).toBe('outlined');
  });
});
