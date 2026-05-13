import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { API_BASE } from '@/constants/api';

async function registerDeviceToken(userId: string, token: string, platform: 'ios' | 'android'): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/notifications/device-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, token, platform }),
    });
  } catch {
    // best-effort
  }
}

async function unregisterDeviceToken(userId: string, token: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/notifications/device-tokens`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, token }),
    });
  } catch {
    // best-effort
  }
}

export function useNotifications(userId: string | null) {
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    let mounted = true;

    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      const tokenData = await Notifications.getDevicePushTokenAsync();
      if (!mounted) return;

      const token = tokenData.data;
      tokenRef.current = token;
      const platform = (Platform.OS === 'ios' ? 'ios' : 'android') as 'ios' | 'android';
      await registerDeviceToken(userId, token, platform);
    })();

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      // Notification handled by the OS in foreground
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (data?.reservationId) {
        router.push(`/booking/${data.reservationId}/check-in` as any);
      } else {
        router.push('/notifications');
      }
    });

    return () => {
      mounted = false;
      receivedSub.remove();
      responseSub.remove();
      if (tokenRef.current) {
        unregisterDeviceToken(userId, tokenRef.current);
      }
    };
  }, [userId]);
}
