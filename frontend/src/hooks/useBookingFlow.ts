import { useNavigate } from '@tanstack/react-router';
import { useAuth } from './useAuth';
import { API_BASE } from '../env';
import type { ReservationResponse } from '../pages/booking/checkout/types';

export interface CheckoutIntent {
  property: { id: string; name: string };
  room: { id: string; type: string; partnerId: string; totalUsd: number; thumbnailUrl?: string; bedType?: string };
  stay: { checkIn: string; checkOut: string; guests: number };
}

const KEY = 'checkoutIntent';

const saveCheckoutIntent = (intent: CheckoutIntent): void =>
  sessionStorage.setItem(KEY, JSON.stringify(intent));

export const peekCheckoutIntent = (): CheckoutIntent | null => {
  const raw = sessionStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as CheckoutIntent) : null;
};

/** Reads and clears — used by CheckoutPage on mount. */
export const consumeCheckoutIntent = (): CheckoutIntent | null => {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  return JSON.parse(raw) as CheckoutIntent;
};

/**
 * Module-level promise — survives StrictMode remounts so the reservation
 * request is fired exactly once when the user clicks "Book".
 */
let pendingReservation: Promise<ReservationResponse> | null = null;

/** Consumes the in-flight promise and resets the slot. */
export const consumeReservationPromise = (): Promise<ReservationResponse> | null => {
  const p = pendingReservation;
  pendingReservation = null;
  return p;
};

/**
 * Standalone fetch — takes credentials explicitly so it can be called before
 * the React auth context has updated (e.g. right after login in MfaPage).
 */
async function fetchReservation(
  intent: CheckoutIntent,
  token: string,
  userId: string,
): Promise<ReservationResponse> {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(`${API_BASE}/api/booking/reservations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      propertyId: intent.property.id,
      roomId: intent.room.id,
      partnerId: intent.room.partnerId,
      bookerId: userId,
      checkIn: intent.stay.checkIn,
      checkOut: intent.stay.checkOut,
    }),
  });
  if (!res.ok) throw new Error(`Reservation failed: HTTP ${res.status}`);
  return res.json() as Promise<ReservationResponse>;
}

/**
 * Called by MfaPage immediately after a successful login.
 * If a checkout intent is pending, fires the reservation request and returns
 * true (caller should navigate to /checkout). Returns false otherwise.
 */
export const startCheckoutAfterLogin = (
  token: string,
  userId: string,
): boolean => {
  const intent = peekCheckoutIntent();
  if (!intent) return false;
  pendingReservation = fetchReservation(intent, token, userId);
  return true;
};

export function useBookingFlow() {
  const auth = useAuth();
  const navigate = useNavigate();

  const createReservation = (intent: CheckoutIntent): Promise<ReservationResponse> =>
    fetchReservation(intent, auth.token!, auth.user!.id);

  const book = (intent: CheckoutIntent): void => {
    saveCheckoutIntent(intent);
    if (auth?.user) {
      pendingReservation = createReservation(intent);
      void navigate({ to: '/booking/checkout' });
    } else {
      void navigate({ to: '/login' });
    }
  };

  return { auth, book, createReservation };
}
