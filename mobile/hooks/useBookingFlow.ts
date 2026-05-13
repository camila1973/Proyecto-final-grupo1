import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import { TOKEN_KEY, USER_KEY } from '@/context/AuthContext';
import type { AuthUser } from '@/context/auth-context';
import {
  clearCheckoutIntent,
  getCheckoutIntent,
  rebuildIntent,
  setCheckoutIntent,
  type CheckoutIntent,
} from '@/services/checkout-store';
import { setPendingReservation } from '@/services/pending-reservations-store';
import { hasHeldReservation, type Reservation } from '@/services/bookings-cache';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface FareBreakdown {
  nights: number;
  roomRateUsd: number;
  subtotalUsd: number;
  taxes: { name: string; amountUsd: number }[];
  fees: { name: string; totalUsd: number }[];
  taxTotalUsd: number;
  feeTotalUsd: number;
  totalUsd: number;
}

export interface CreatedReservation {
  id: string;
  grandTotalUsd: number;
  holdExpiresAt: string;
  fareBreakdown: FareBreakdown;
}

export class BookingFlowError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'BookingFlowError';
  }
}

export function useBookingFlow() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { t } = useTranslation();

  const book = useCallback(
    (intent: CheckoutIntent): void => {
      if (!intent.checkIn || !intent.checkOut) {
        Alert.alert(t('property.selectDatesTitle'), t('property.selectDatesMsg'));
        return;
      }
      setCheckoutIntent(intent);
      router.push(user ? '/booking/checkout' : '/sign-in-required');
    },
    [router, user, t],
  );

  const resumeAfterAuth = useCallback(async (): Promise<void> => {
    const intent = getCheckoutIntent();
    if (intent) {
      router.replace('/booking/checkout');
      return;
    }
    // Read directly from AsyncStorage — react context state may not have
    // settled yet in the tick right after login()/verifyMfa() resolves.
    const [freshToken, rawUser] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
    ]);
    if (!freshToken || !rawUser) {
      router.replace('/(tabs)');
      return;
    }
    const freshUser = JSON.parse(rawUser) as AuthUser;
    const hasHeld = await hasHeldReservation(freshToken, freshUser.id);
    router.replace(hasHeld ? '/(tabs)/trips' : '/(tabs)');
  }, [router]);

  const resumeHeld = useCallback(
    (reservation: Reservation): boolean => {
      const intent = rebuildIntent(reservation);
      if (!intent) return false;
      setCheckoutIntent(intent);
      router.push('/booking/checkout');
      return true;
    },
    [router],
  );

  const createReservation = useCallback(async (): Promise<CreatedReservation> => {
    const intent = getCheckoutIntent();
    if (!intent || !token || !user) {
      throw new BookingFlowError('Missing intent or authentication');
    }

    const payload = {
      propertyId: intent.propertyId,
      roomId: intent.roomId,
      partnerId: intent.partnerId,
      bookerId: user.id,
      checkIn: intent.checkIn,
      checkOut: intent.checkOut,
    };

    const res = await fetch(`${API_BASE}/api/booking/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let backendMessage = t('checkout.errorHold');
      try {
        const errorJson = JSON.parse(errorText);
        if (typeof errorJson.message === 'string') backendMessage = errorJson.message;
        else if (typeof errorJson.error === 'string') backendMessage = errorJson.error;
      } catch {
        if (errorText && errorText.length < 200) backendMessage = errorText;
      }
      throw new BookingFlowError(backendMessage);
    }

    const data = (await res.json()) as CreatedReservation;
    setPendingReservation(true);
    return data;
  }, [token, user, t]);

  return { book, resumeAfterAuth, resumeHeld, createReservation, clearCheckoutIntent };
}
