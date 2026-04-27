import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const CACHE_KEY = '@bookings_cache';

export interface ReservationSnapshot {
  propertyName: string;
  propertyCity: string;
  propertyNeighborhood: string | null;
  propertyCountryCode: string;
  propertyThumbnailUrl: string | null;
  roomType: string;
}

export type ReservationStatus =
  | 'held'
  | 'submitted'
  | 'confirmed'
  | 'expired'
  | 'failed'
  | 'cancelled';

export interface Reservation {
  id: string;
  propertyId: string;
  roomId: string;
  partnerId: string;
  bookerId: string;
  checkIn: string;
  checkOut: string;
  status: ReservationStatus;
  reason: string | null;
  grandTotalUsd: number | null;
  snapshot: ReservationSnapshot | null;
  holdExpiresAt: string | null;
  createdAt: string;
}

export const ACTIVE_STATUSES: ReservationStatus[] = ['held', 'submitted', 'confirmed'];

export async function fetchReservations(token: string, userId: string): Promise<Reservation[]> {
  const res = await fetch(
    `${API_BASE}/api/booking/reservations?bookerId=${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Reservations fetch failed: ${res.status}`);
  const data = await res.json() as { reservations: Reservation[] };
  return data.reservations;
}

export async function cacheReservations(reservations: Reservation[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(reservations));
}

export async function getCachedReservations(): Promise<Reservation[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Reservation[];
  } catch {
    return [];
  }
}

export async function syncReservations(token: string, userId: string): Promise<Reservation[]> {
  const reservations = await fetchReservations(token, userId);
  await cacheReservations(reservations);
  return reservations;
}
