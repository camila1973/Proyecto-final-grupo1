import { useEffect, useState } from 'react';
import { fetchReservationById } from '../utils/queries';
import { type ReservationResponse } from '../pages/booking/checkout/types';

export function useReservation(id: string) {
  const [reservation, setReservation] = useState<ReservationResponse | null>(null);

  useEffect(() => {
    fetchReservationById(id)
      .then((data) => setReservation(data))
      .catch(() => null);
  }, [id]);

  return reservation;
}
