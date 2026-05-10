// Cancellation policy applied to confirmed reservations.
// Real refund disbursement against Stripe is tracked in `cancel()` as a TODO;
// this module exposes a deterministic quote so the UI and partner dashboards
// can preview the refund before the user commits to cancelling.

export type RefundPolicy = "full_refund" | "partial_refund" | "no_refund";

export interface RefundQuote {
  policy: RefundPolicy;
  refundableUsd: number;
  daysUntilCheckIn: number;
}

const FULL_REFUND_DAYS = 7;
const PARTIAL_REFUND_DAYS = 2;
const PARTIAL_REFUND_RATE = 0.5;

export function computeDaysUntilCheckIn(
  checkIn: string,
  now: Date = new Date(),
): number {
  const checkInDay = checkIn.slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor(
    (new Date(checkInDay).getTime() - new Date(today).getTime()) / msPerDay,
  );
}

export function quoteRefund(
  grandTotalUsd: number,
  checkIn: string,
  now: Date = new Date(),
): RefundQuote {
  const daysUntilCheckIn = computeDaysUntilCheckIn(checkIn, now);

  if (daysUntilCheckIn >= FULL_REFUND_DAYS) {
    return {
      policy: "full_refund",
      refundableUsd: round2(grandTotalUsd),
      daysUntilCheckIn,
    };
  }

  if (daysUntilCheckIn >= PARTIAL_REFUND_DAYS) {
    return {
      policy: "partial_refund",
      refundableUsd: round2(grandTotalUsd * PARTIAL_REFUND_RATE),
      daysUntilCheckIn,
    };
  }

  return { policy: "no_refund", refundableUsd: 0, daysUntilCheckIn };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
