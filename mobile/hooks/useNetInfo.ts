import { useEffect, useRef, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export type ConnectionType = 'wifi' | 'cellular' | 'none' | 'unknown';

export interface NetInfoResult {
  /** True only when the device has confirmed internet access (not just a local network) */
  isConnected: boolean;
  /** Whether we have a local network link (WiFi/cellular) even if internet is unreachable */
  hasNetwork: boolean;
  connectionType: ConnectionType;
  /** True while the initial connectivity check is in flight */
  isLoading: boolean;
}

export function resolveType(state: NetInfoState): ConnectionType {
  if (state.type === 'wifi') return 'wifi';
  if (state.type === 'cellular') return 'cellular';
  if (state.isConnected) return 'unknown';
  return 'none';
}

export function resolveConnected(state: NetInfoState): boolean {
  // isInternetReachable is the ground truth — it probes an external host.
  // Fall back to isConnected only if reachability hasn't been determined yet (null).
  if (state.isInternetReachable === true) return true;
  if (state.isInternetReachable === false) return false;
  return state.isConnected ?? false;
}

/**
 * Debounce delay (ms) before declaring "offline".
 * Avoids flashing the offline banner on brief network handoffs
 * (e.g. switching from WiFi to cellular takes ~500 ms).
 */
const OFFLINE_DEBOUNCE_MS = 2000;

export function useNetInfo(): NetInfoResult {
  const [result, setResult] = useState<NetInfoResult>({
    isConnected: true,
    hasNetwork: true,
    connectionType: 'unknown',
    isLoading: true,
  });

  const offlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function applyState(state: NetInfoState) {
      const connected = resolveConnected(state);
      const hasNetwork = state.isConnected ?? false;
      const connectionType = resolveType(state);

      if (connected) {
        // Online — cancel any pending "going offline" timer and update immediately
        if (offlineTimer.current) {
          clearTimeout(offlineTimer.current);
          offlineTimer.current = null;
        }
        setResult({ isConnected: true, hasNetwork, connectionType, isLoading: false });
      } else {
        // Offline — wait before declaring it to absorb brief handoffs
        if (!offlineTimer.current) {
          offlineTimer.current = setTimeout(() => {
            offlineTimer.current = null;
            setResult({ isConnected: false, hasNetwork, connectionType, isLoading: false });
          }, OFFLINE_DEBOUNCE_MS);
        }
      }
    }

    // Fetch current state immediately on mount
    NetInfo.fetch().then(applyState);

    const unsubscribe = NetInfo.addEventListener(applyState);
    return () => {
      unsubscribe();
      if (offlineTimer.current) clearTimeout(offlineTimer.current);
    };
  }, []);

  return result;
}
