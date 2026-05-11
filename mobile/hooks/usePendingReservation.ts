import { useSyncExternalStore } from 'react';
import {
  getPendingReservation,
  subscribePendingReservation,
} from '@/services/pending-reservations-store';

export function usePendingReservation(): boolean {
  return useSyncExternalStore(subscribePendingReservation, getPendingReservation);
}
