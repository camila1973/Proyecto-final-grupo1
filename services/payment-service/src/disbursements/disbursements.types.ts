export interface PropertyRollup {
  propertyId: string;
  propertyName: string;
  gross: number;
  tax: number;
  partnerFee: number;
  commission: number;
  net: number;
  paymentCount: number;
}

export interface DisbursementResponse {
  partnerId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  scheduledFor: string; // YYYY-MM-DD
  currency: string;
  status: DisbursementStatus;
  paidAt: string | null;
  externalTransferRef: string | null;
  totals: AggregateTotals;
  byProperty: PropertyRollup[];
  paymentCount: number;
}

export type DisbursementStatus = "pending" | "paid" | "failed" | "projected";

export interface AggregateTotals {
  gross: number;
  tax: number;
  partnerFee: number;
  commission: number;
  net: number;
}

export interface DisbursementMonth {
  month: string; // YYYY-MM
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD (exclusive)
  scheduledFor: string; // YYYY-MM-DD
  status: DisbursementStatus;
  paidAt: string | null;
  externalTransferRef: string | null;
  totals: AggregateTotals;
  byProperty: PropertyRollup[];
  paymentCount: number;
}

export interface DisbursementHistoryResponse {
  partnerId: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD (exclusive)
  currency: "USD";
  totals: AggregateTotals;
  paymentCount: number;
  months: DisbursementMonth[];
}
