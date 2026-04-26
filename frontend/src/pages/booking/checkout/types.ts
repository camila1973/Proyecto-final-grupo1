export interface FareBreakdown {
  nights: number;
  roomRateUsd: number;
  subtotalUsd: number;
  taxes: { name: string; amountUsd: number }[];
  fees: { name: string; totalUsd: number }[];
  taxTotalUsd: number;
  feeTotalUsd: number;
  totalUsd: number;
}

export interface ReservationResponse {
  id: string;
  checkIn: string;
  checkOut: string;
  fareBreakdown: FareBreakdown;
  grandTotalUsd: number;
  holdExpiresAt: string;
}
