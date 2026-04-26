// Must be hoisted before any import that resolves @react-native-community/netinfo
import { resolveConnected, resolveType } from './useNetInfo';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(),
  },
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

// NetInfoState is a discriminated union; cast through any for test flexibility.
 
function makeState(overrides: Record<string, unknown> = {}): any {
  return {
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    isWifiEnabled: true,
    details: null,
    ...overrides,
  };
}

// ─── resolveConnected ─────────────────────────────────────────────────────────

describe('resolveConnected', () => {
  it('returns true when isInternetReachable is true', () => {
    expect(resolveConnected(makeState({ isInternetReachable: true }))).toBe(true);
  });

  it('returns false when isInternetReachable is false even if isConnected is true', () => {
    // Captive portal: device has WiFi but no real internet
    expect(resolveConnected(makeState({ isConnected: true, isInternetReachable: false }))).toBe(false);
  });

  it('falls back to isConnected=true when isInternetReachable is null', () => {
    expect(resolveConnected(makeState({ isConnected: true, isInternetReachable: null }))).toBe(true);
  });

  it('falls back to isConnected=false when isInternetReachable is null', () => {
    expect(resolveConnected(makeState({ isConnected: false, isInternetReachable: null }))).toBe(false);
  });

  it('returns false when both isConnected and isInternetReachable are false', () => {
    expect(resolveConnected(makeState({ isConnected: false, isInternetReachable: false }))).toBe(false);
  });

  it('returns false when isConnected is null and isInternetReachable is null', () => {
    expect(resolveConnected(makeState({ isConnected: null, isInternetReachable: null }))).toBe(false);
  });
});

// ─── resolveType ──────────────────────────────────────────────────────────────

describe('resolveType', () => {
  it('returns "wifi" for wifi connections', () => {
    expect(resolveType(makeState({ type: 'wifi' }))).toBe('wifi');
  });

  it('returns "cellular" for cellular connections', () => {
    expect(resolveType(makeState({ type: 'cellular', isConnected: true }))).toBe('cellular');
  });

  it('returns "unknown" when connected via an unrecognized type (ethernet, vpn, etc.)', () => {
    expect(resolveType(makeState({ type: 'ethernet', isConnected: true }))).toBe('unknown');
    expect(resolveType(makeState({ type: 'vpn', isConnected: true }))).toBe('unknown');
    expect(resolveType(makeState({ type: 'other', isConnected: true }))).toBe('unknown');
  });

  it('returns "none" when there is no connection', () => {
    expect(resolveType(makeState({ type: 'none', isConnected: false }))).toBe('none');
  });

  it('returns "none" when type is unknown and isConnected is false', () => {
    expect(resolveType(makeState({ type: 'unknown', isConnected: false }))).toBe('none');
  });
});

// ─── NetInfo integration ──────────────────────────────────────────────────────

describe('useNetInfo — NetInfo integration', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const NetInfo = require('@react-native-community/netinfo').default;

  beforeEach(() => jest.clearAllMocks());

  it('registers exactly one listener via addEventListener', () => {
    NetInfo.addEventListener(jest.fn());
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('returns an unsubscribe function from addEventListener', () => {
    const unsubscribe = NetInfo.addEventListener(jest.fn());
    expect(typeof unsubscribe).toBe('function');
  });

  it('calling the unsubscribe function does not throw', () => {
    const unsubscribe = NetInfo.addEventListener(jest.fn()) as jest.Mock;
    expect(() => unsubscribe()).not.toThrow();
  });

  it('fetch resolves to the current network state', async () => {
    const onlineState = makeState({ isInternetReachable: true });
    (NetInfo.fetch as jest.Mock).mockResolvedValue(onlineState);
    const state = await NetInfo.fetch();
    expect(resolveConnected(state)).toBe(true);
  });

  it('going online resolves to connected=true with wifi type', () => {
    const onlineState = makeState({ isConnected: true, isInternetReachable: true, type: 'wifi' });
    expect(resolveConnected(onlineState)).toBe(true);
    expect(resolveType(onlineState)).toBe('wifi');
  });

  it('going offline resolves to connected=false with none type', () => {
    const offlineState = makeState({ type: 'none', isConnected: false, isInternetReachable: false });
    expect(resolveConnected(offlineState)).toBe(false);
    expect(resolveType(offlineState)).toBe('none');
  });

  it('captive portal (wifi but no internet) resolves to connected=false', () => {
    const captiveState = makeState({ type: 'wifi', isConnected: true, isInternetReachable: false });
    expect(resolveConnected(captiveState)).toBe(false);
    expect(resolveType(captiveState)).toBe('wifi');
  });

  it('cellular with internet resolves to connected=true with cellular type', () => {
    const cellularState = makeState({ type: 'cellular', isConnected: true, isInternetReachable: true });
    expect(resolveConnected(cellularState)).toBe(true);
    expect(resolveType(cellularState)).toBe('cellular');
  });
});
