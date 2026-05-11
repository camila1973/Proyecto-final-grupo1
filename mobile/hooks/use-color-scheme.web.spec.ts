import * as React from 'react';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
  useEffect: jest.fn(),
}));

jest.mock('react-native', () => ({
  useColorScheme: jest.fn(),
}));

// Imported after mocks are in place
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useColorScheme } = require('./use-color-scheme.web');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require('react-native');

afterEach(() => jest.clearAllMocks());

describe('useColorScheme (web)', () => {
  it('returns "light" before hydration', () => {
    (React.useState as jest.Mock).mockReturnValueOnce([false, jest.fn()]);
    (React.useEffect as jest.Mock).mockImplementationOnce(jest.fn());
    RN.useColorScheme.mockReturnValue('dark');

    expect(useColorScheme()).toBe('light');
  });

  it('returns the system color scheme after hydration', () => {
    (React.useState as jest.Mock).mockReturnValueOnce([true, jest.fn()]);
    (React.useEffect as jest.Mock).mockImplementationOnce(jest.fn());
    RN.useColorScheme.mockReturnValue('dark');

    expect(useColorScheme()).toBe('dark');
  });

  it('returns null when hydrated and system scheme is null', () => {
    (React.useState as jest.Mock).mockReturnValueOnce([true, jest.fn()]);
    (React.useEffect as jest.Mock).mockImplementationOnce(jest.fn());
    RN.useColorScheme.mockReturnValue(null);

    expect(useColorScheme()).toBeNull();
  });

  it('useEffect callback calls the state setter to mark hydration', () => {
    const setHasHydrated = jest.fn();
    (React.useState as jest.Mock).mockReturnValueOnce([false, setHasHydrated]);

    let capturedEffect: (() => void) | undefined;
    (React.useEffect as jest.Mock).mockImplementationOnce((fn: () => void) => {
      capturedEffect = fn;
    });
    RN.useColorScheme.mockReturnValue('light');

    useColorScheme();
    capturedEffect?.();

    expect(setHasHydrated).toHaveBeenCalledWith(true);
  });
});
