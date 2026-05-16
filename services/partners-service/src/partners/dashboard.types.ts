export interface ReservationDto {
  id: string;
  propertyId: string;
  roomId: string;
  partnerId: string;
  bookerId: string;
  status: string;
  checkIn: string;
  checkOut: string;
  grandTotalUsd: number | null;
  guestInfo: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  } | null;
  snapshot: {
    propertyName?: string;
    propertyCity?: string;
    propertyNeighborhood?: string | null;
    propertyCountryCode?: string;
    propertyThumbnailUrl?: string | null;
    roomType?: string;
  } | null;
  createdAt: string;
}

export interface PaymentDto {
  id: string;
  reservationId: string;
  status: string;
  amountUsd: number;
  currency: string;
  guestEmail: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
  // Snapshot fields (populated from payment-service when available; null on
  // payments created before the breakdown migration).
  partnerId?: string | null;
  propertyId?: string | null;
  propertyName?: string | null;
  grossAmountUsd?: number | null;
  taxAmountUsd?: number | null;
  partnerFeeUsd?: number | null;
  commissionRate?: number | null;
  commissionAmountUsd?: number | null;
  netPayoutUsd?: number | null;
  capturedAt?: string | null;
}

export interface MetricCard {
  confirmed: number;
  cancelled: number;
  revenueUsd: number;
  lossesUsd: number;
  netUsd: number;
}

export interface MonthlySeriesPoint {
  month: string;
  revenueUsd: number;
  lossesUsd: number;
  occupancyRate: number;
}

export interface PartnerReservation {
  id: string;
  status: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCount: number;
  checkIn: string;
  checkOut: string;
  roomType: string;
  grandTotalUsd: number | null;
}

export interface PaymentRow {
  reservationId: string;
  propertyId: string;
  propertyName: string;
  status: string;
  paymentMethod: string;
  reference: string;
  nights: number;
  ratePerNightUsd: number;
  subtotalUsd: number;
  taxesUsd: number;
  totalPaidUsd: number;
  commissionUsd: number;
  earningsUsd: number;
  createdAt: string;
}

export interface DisbursementPropertyRollup {
  propertyId: string;
  propertyName: string;
  gross: number;
  tax: number;
  partnerFee: number;
  commission: number;
  net: number;
  paymentCount: number;
}

export interface DisbursementDto {
  partnerId: string;
  periodStart: string;
  periodEnd: string;
  scheduledFor: string;
  currency: string;
  status: DisbursementStatus;
  paidAt: string | null;
  externalTransferRef: string | null;
  totals: DisbursementAggregateTotals;
  byProperty: DisbursementPropertyRollup[];
  paymentCount: number;
}

export type DisbursementStatus = "pending" | "paid" | "failed" | "projected";

export interface DisbursementAggregateTotals {
  gross: number;
  tax: number;
  partnerFee: number;
  commission: number;
  net: number;
}

export interface DisbursementMonthDto {
  month: string; // YYYY-MM
  periodStart: string;
  periodEnd: string;
  scheduledFor: string;
  status: DisbursementStatus;
  paidAt: string | null;
  externalTransferRef: string | null;
  totals: DisbursementAggregateTotals;
  byProperty: DisbursementPropertyRollup[];
  paymentCount: number;
}

export interface DisbursementHistoryResponse {
  partnerId: string;
  from: string; // YYYY-MM-DD
  to: string; // exclusive
  currency: "USD";
  totals: DisbursementAggregateTotals;
  paymentCount: number;
  months: DisbursementMonthDto[];
}

export interface PaymentsResponse {
  partnerId: string;
  propertyId: string | null;
  from: string;
  to: string;
  total: number;
  page: number;
  pageSize: number;
  totals: {
    gross: number;
    commission: number;
    net: number;
    count: number;
  };
  rows: PaymentRow[];
}

export interface CapturedPaymentDto {
  paymentId: string;
  reservationId: string;
  propertyId: string | null;
  propertyName: string | null;
  status: string;
  stripePaymentIntentId: string | null;
  grossAmountUsd: number;
  taxAmountUsd: number;
  commissionRate: number;
  commissionAmountUsd: number;
  netPayoutUsd: number;
  capturedAt: string | null;
  createdAt: string;
  fareSnapshot: Record<string, unknown> | null;
}

export interface CapturedPaymentsResponse {
  partnerId: string;
  from: string;
  to: string;
  currency: string;
  totals: {
    grossUsd: number;
    taxUsd: number;
    commissionUsd: number;
    netUsd: number;
    count: number;
  };
  rows: CapturedPaymentDto[];
}

export interface PropertySummary {
  propertyId: string;
  propertyName: string;
  propertyCity: string;
  propertyNeighborhood: string | null;
  propertyCountryCode: string;
  propertyThumbnailUrl: string | null;
  createdAt: string;
  roomCount: number;
  reservationCount: number;
}

export interface PartnerPropertiesResponse {
  partnerId: string;
  properties: PropertySummary[];
}

export interface PartnerMetricsResponse {
  partnerId: string;
  month: string;
  roomType: string | null;
  metrics: MetricCard;
  monthlySeries: MonthlySeriesPoint[];
}

export interface PropertyMetricsResponse {
  partnerId: string;
  propertyId: string;
  month: string;
  roomType: string | null;
  metrics: MetricCard;
  monthlySeries: MonthlySeriesPoint[];
}

export interface PropertyReservationsResponse {
  partnerId: string;
  propertyId: string;
  month: string;
  roomType: string | null;
  status: string | null;
  reservationId: string | null;
  guestName: string | null;
  reservations: PartnerReservation[];
}

export interface RoomDetail {
  id: string;
  propertyId: string;
  roomType: string;
  bedType: string;
  viewType: string;
  capacity: number;
  totalRooms: number;
  basePriceUsd: number;
  status: string;
}

export interface RoomAvailabilityDay {
  date: string;
  totalRooms: number;
  reservedRooms: number;
  heldRooms: number;
  blocked: boolean;
  available: boolean;
}

export interface RoomRatePeriod {
  id: string;
  roomId: string;
  fromDate: string;
  toDate: string;
  priceUsd: number;
  currency: string;
  createdAt: string;
}

export interface PropertyRoomRow {
  roomId: string;
  roomType: string;
  capacity: number;
  bedType: string;
  basePriceUsd: number;
  totalRooms: number;
  status: string;
  occupancyRate: number;
}

export interface PropertyRoomsResponse {
  partnerId: string;
  propertyId: string;
  month: string;
  rooms: PropertyRoomRow[];
}
