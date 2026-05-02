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

export interface HotelStateResponse {
  partnerId: string;
  propertyId: string | null;
  month: string;
  roomType: string | null;
  metrics: MetricCard;
  monthlySeries: MonthlySeriesPoint[];
  reservations: PartnerReservation[];
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

export interface PaymentsResponse {
  partnerId: string;
  month: string | null;
  total: number;
  page: number;
  pageSize: number;
  rows: PaymentRow[];
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
