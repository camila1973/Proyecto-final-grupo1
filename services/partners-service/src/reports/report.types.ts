import type { PaymentRow } from "../partners/dashboard.types.js";

export type ReportLocale = "es" | "en";

export interface ReportHeader {
  partnerId: string;
  partnerName: string;
  propertyId: string | null;
  propertyName: string | null;
  from: string;
  to: string;
  generatedAt: string;
  currency: "USD";
}

export interface ReportTotals {
  grossUsd: number;
  taxUsd: number;
  commissionUsd: number;
  netUsd: number;
  count: number;
}

export interface ReportData {
  header: ReportHeader;
  totals: ReportTotals;
  rows: PaymentRow[];
}
