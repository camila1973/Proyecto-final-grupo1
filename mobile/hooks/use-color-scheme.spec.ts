import { useColorScheme } from './use-color-scheme';

describe('useColorScheme (native)', () => {
  it('always returns light', () => {
    expect(useColorScheme()).toBe('light');
  });
});
