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
  status: "pending" | "paid" | "failed" | "projected";
  paidAt: string | null;
  externalTransferRef: string | null;
  totals: {
    gross: number;
    tax: number;
    partnerFee: number;
    commission: number;
    net: number;
  };
  byProperty: PropertyRollup[];
  paymentCount: number;
}
