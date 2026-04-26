export interface CheckoutIntent {
  propertyId: string;
  propertyName: string;
  propertyCity: string;
  propertyThumbnailUrl: string | null;
  roomId: string;
  roomType: string;
  partnerId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  estimatedTotalUsd: number;
}

let _intent: CheckoutIntent | null = null;

export const setCheckoutIntent = (intent: CheckoutIntent): void => {
  _intent = intent;
};

export const getCheckoutIntent = (): CheckoutIntent | null => _intent;

export const clearCheckoutIntent = (): void => {
  _intent = null;
};

/**
 * Reconstruye un CheckoutIntent desde una Reservation.
 * Útil para retomar el flujo de checkout desde reservas "held" o "failed".
 * 
 * @param reservation - Reserva con snapshot completo
 * @returns CheckoutIntent reconstruido o null si falta información
 * 
 * @example
 * ```tsx
 * const intent = rebuildIntent(reservation);
 * if (intent) {
 *   setCheckoutIntent(intent);
 *   router.push('/booking/checkout');
 * }
 * ```
 */
export function rebuildIntent(reservation: {
  propertyId: string;
  roomId: string;
  partnerId: string;
  checkIn: string;
  checkOut: string;
  grandTotalUsd: number | null;
  snapshot: {
    propertyName: string;
    propertyCity: string;
    propertyThumbnailUrl: string | null;
    roomType: string;
  } | null;
}): CheckoutIntent | null {
  // Validar que tengamos el snapshot necesario
  if (!reservation.snapshot) {
    return null;
  }

  return {
    propertyId: reservation.propertyId,
    propertyName: reservation.snapshot.propertyName,
    propertyCity: reservation.snapshot.propertyCity,
    propertyThumbnailUrl: reservation.snapshot.propertyThumbnailUrl,
    roomId: reservation.roomId,
    roomType: reservation.snapshot.roomType,
    partnerId: reservation.partnerId,
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
    // Valor por defecto para guests - no es crítico ya que el hold ya fue creado
    guests: 2,
    estimatedTotalUsd: reservation.grandTotalUsd ?? 0,
  };
}
