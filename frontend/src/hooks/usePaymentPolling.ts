import { useEffect, useState } from 'react';
import { fetchPaymentStatus, type PaymentStatus } from '../utils/queries';

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 60_000;

export function usePaymentPolling(id: string) {
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [failureReason, setFailureReason] = useState<string | undefined>();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      try {
        const data = await fetchPaymentStatus(id);
        setStatus(data.status);
        if (data.failureReason) setFailureReason(data.failureReason);
        if (data.status === 'pending') {
          timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
        }
      } catch {
        timer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      }
    };

    void poll();
    return () => clearTimeout(timer);
  }, [id]);

  return { status, failureReason, timedOut };
}
