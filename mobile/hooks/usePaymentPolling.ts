import { useEffect, useState } from 'react';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 60_000;

export type PaymentStatus = 'pending' | 'captured' | 'failed';

export interface PaymentStatusResponse {
  status: PaymentStatus;
  failureReason?: string;
}

/**
 * Hook para hacer polling del estado del pago después de confirmar con Stripe.
 * Necesario porque el webhook de Stripe puede tardar unos segundos en llegar.
 * 
 * @param reservationId - ID de la reserva para consultar su pago asociado
 * @returns estado actual del pago, razón de fallo (si aplica), y si hubo timeout
 * 
 * @example
 * ```tsx
 * const { status, failureReason, timedOut } = usePaymentPolling(reservationId);
 * 
 * if (status === 'pending' && !timedOut) {
 *   return <Spinner />;
 * }
 * if (status === 'failed') {
 *   return <ErrorScreen reason={failureReason} />;
 * }
 * return <SuccessScreen />;
 * ```
 */
export function usePaymentPolling(reservationId: string) {
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [failureReason, setFailureReason] = useState<string | undefined>();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      // Timeout después de 60 segundos
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE}/api/payment/payments/${reservationId}/status`,
        );
        
        if (!res.ok) {
          // Si falla la petición, reintentar
          timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
          return;
        }

        const data = (await res.json()) as PaymentStatusResponse;
        setStatus(data.status);
        
        if (data.failureReason) {
          setFailureReason(data.failureReason);
        }

        // Solo continuar polling si está pendiente
        if (data.status === 'pending') {
          timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
        }
      } catch {
        // En caso de error de red, reintentar
        timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      }
    };

    void poll();

    // Cleanup: cancelar el timer cuando el componente se desmonte
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [reservationId]);

  return { status, failureReason, timedOut };
}
