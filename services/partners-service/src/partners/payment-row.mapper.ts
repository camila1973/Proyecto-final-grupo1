import type { PaymentRow } from "./dashboard.types.js";

// Fallback rates used only when payment-service has not yet snapshotted these
// values on a payment row (legacy/pre-migration data path).
export const FALLBACK_COMMISSION_RATE = 0.2;
export const FALLBACK_TAX_RATE = 0.19;

export interface PaymentSnapshotInput {
  propertyId?: string | null;
  propertyName?: string | null;
  status?: string | null;
  stripePaymentIntentId?: string | null;
  grossAmountUsd?: number | null;
  taxAmountUsd?: number | null;
  commissionAmountUsd?: number | null;
  netPayoutUsd?: number | null;
  amountUsd?: number | null;
  createdAt?: string | null;
}

export interface ReservationFallbackInput {
  reservationId: string;
  propertyId?: string;
  propertyName?: string;
  status?: string;
  grandTotalUsd?: number | null;
  checkIn?: string;
  checkOut?: string;
  createdAt?: string;
}

export function mapSnapshotToPaymentRow(
  payment: PaymentSnapshotInput | null,
  fallback: ReservationFallbackInput,
  nights: number,
): PaymentRow {
  const total =
    payment?.grossAmountUsd ??
    fallback.grandTotalUsd ??
    payment?.amountUsd ??
    0;
  const taxes =
    payment?.taxAmountUsd ?? total - total / (1 + FALLBACK_TAX_RATE);
  const subtotal = total - taxes;
  const ratePerNight = nights > 0 ? subtotal / nights : 0;
  const commission =
    payment?.commissionAmountUsd ?? round(total * FALLBACK_COMMISSION_RATE);
  const earnings = payment?.netPayoutUsd ?? round(total - commission);

  return {
    reservationId: fallback.reservationId,
    propertyId: payment?.propertyId ?? fallback.propertyId ?? "",
    propertyName: payment?.propertyName ?? fallback.propertyName ?? "",
    status: payment?.status ?? fallback.status ?? "unknown",
    paymentMethod: payment?.stripePaymentIntentId ? "STRIPE" : "—",
    reference: payment?.stripePaymentIntentId ?? "—",
    nights,
    ratePerNightUsd: round(ratePerNight),
    subtotalUsd: round(subtotal),
    taxesUsd: round(taxes),
    totalPaidUsd: round(total),
    commissionUsd: round(-commission),
    earningsUsd: round(earnings),
    createdAt:
      payment?.createdAt ?? fallback.createdAt ?? new Date().toISOString(),
  };
}

export function countNights(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / 86_400_000);
}

function round(n: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
