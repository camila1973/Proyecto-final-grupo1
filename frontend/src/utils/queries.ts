import { API_BASE } from '../env';
import type { SearchResult, SearchResponse, TaxonomyResponse } from '../pages/search/types';
import type { ReservationResponse } from '../pages/booking/checkout/types';

// ─── Search ───────────────────────────────────────────────────────────────────

export interface CitySuggestion {
  id: string;
  city: string;
  country: string;
}

export async function fetchCitySuggestions(query: string): Promise<CitySuggestion[]> {
  if (!query.trim()) return [];
  const res = await fetch(`${API_BASE}/api/search/cities?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.suggestions ?? []) as CitySuggestion[];
}

export async function fetchFeatured(): Promise<SearchResult[]> {
  const res = await fetch(`${API_BASE}/api/search/featured?limit=3`);
  if (!res.ok) throw new Error('Failed to fetch featured properties');
  const data: SearchResponse = await res.json();
  return data.results;
}

export async function fetchTaxonomies(): Promise<TaxonomyResponse> {
  const res = await fetch(`${API_BASE}/api/search/taxonomies`);
  if (!res.ok) throw new Error('Failed to fetch taxonomies');
  return res.json() as Promise<TaxonomyResponse>;
}

export async function fetchSearchProperties(queryParams: URLSearchParams): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/api/search/properties?${queryParams}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json() as Promise<SearchResponse>;
}

// ─── Property ─────────────────────────────────────────────────────────────────

export interface SearchRoom {
  roomId: string;
  roomType: string;
  bedType: string;
  viewType: string;
  capacity: number;
  basePriceUsd: number;
  priceUsd: number | null;
  taxRatePct: number;
  partnerId: string;
  estimatedTotalUsd: number;
  hasFlatFees: boolean;
}

export interface PropertyInfo {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  neighborhood: string | null;
  stars: number;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  imageUrls?: string[];
  description?: string;
  descriptionByLang?: Record<string, string>;
  amenities: string[];
}

export interface PropertyRoomsResponse {
  property: PropertyInfo | null;
  rooms: SearchRoom[];
}

export async function fetchPropertyRooms(
  propertyId: string,
  checkIn?: string,
  checkOut?: string,
  guests?: number,
  lang?: string,
): Promise<PropertyRoomsResponse> {
  const params = new URLSearchParams();
  if (checkIn) params.set('checkIn', checkIn);
  if (checkOut) params.set('checkOut', checkOut);
  if (guests) params.set('guests', String(guests));
  if (lang) params.set('lang', lang);
  const qs = params.toString();
  const res = await fetch(
    `${API_BASE}/api/search/properties/${propertyId}/rooms${qs ? `?${qs}` : ''}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch rooms for property ${propertyId}`);
  return res.json() as Promise<PropertyRoomsResponse>;
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  reviewerName: string;
  reviewerCountry: string | null;
  rating: number;
  language: string;
  title: string | null;
  comment: string;
  createdAt: string;
}

export interface ReviewsResponse {
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    averageRating: number;
  };
  reviews: Review[];
}

const REVIEWS_PAGE_SIZE = 5;

export async function fetchReviews(
  propertyId: string,
  page: number,
  lang?: string,
): Promise<ReviewsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(REVIEWS_PAGE_SIZE),
  });
  if (lang) params.set('lang', lang);
  const res = await fetch(
    `${API_BASE}/api/search/properties/${propertyId}/reviews?${params.toString()}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch reviews for property ${propertyId}`);
  return res.json() as Promise<ReviewsResponse>;
}

// ─── Booking ──────────────────────────────────────────────────────────────────

export interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export async function patchGuestInfo(reservationId: string, info: GuestInfo): Promise<void> {
  const res = await fetch(`${API_BASE}/api/booking/reservations/${reservationId}/guest-info`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(info),
  });
  if (!res.ok) throw new Error('guest_info_failed');
}

export interface InitiatePaymentParams {
  reservationId: string;
  amountUsd: number;
  currency: string;
  guestEmail: string;
}

export async function initiatePayment(params: InitiatePaymentParams): Promise<string> {
  const res = await fetch(`${API_BASE}/api/payment/payments/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to initiate payment');
  const data = (await res.json()) as { clientSecret: string };
  return data.clientSecret;
}

// ─── Payment / Booking ────────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'captured' | 'failed';

export interface StatusResponse {
  status: PaymentStatus;
  failureReason?: string;
}

export async function fetchPaymentStatus(id: string): Promise<StatusResponse> {
  const res = await fetch(`${API_BASE}/api/payment/payments/${id}/status`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<StatusResponse>;
}

export async function fetchReservationById(id: string): Promise<ReservationResponse> {
  const res = await fetch(`${API_BASE}/api/booking/reservations/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<ReservationResponse>;
}

// ─── My Reservations ──────────────────────────────────────────────────────────

export type ReservationStatus = 'held' | 'submitted' | 'confirmed' | 'failed' | 'expired' | 'cancelled';

export interface ReservationSnapshot {
  propertyName: string;
  propertyCity: string;
  propertyNeighborhood: string | null;
  propertyCountryCode: string;
  propertyThumbnailUrl: string | null;
  roomType: string;
}

export interface ReservationListItem {
  id: string;
  status: ReservationStatus;
  propertyId: string;
  roomId: string;
  partnerId: string;
  checkIn: string;
  checkOut: string;
  grandTotalUsd: number;
  createdAt: string;
  snapshot: ReservationSnapshot | null;
}

export async function fetchMyReservations(token: string, bookerId: string): Promise<ReservationListItem[]> {
  const res = await fetch(`${API_BASE}/api/booking/reservations?bookerId=${encodeURIComponent(bookerId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { reservations?: ReservationListItem[] } | ReservationListItem[];
  return Array.isArray(data) ? data : (data.reservations ?? []);
}

export async function cancelReservation(id: string, token: string, reason: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/booking/reservations/${id}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ─── Partner Dashboard (B2B) ──────────────────────────────────────────────────

export interface PartnerMetricCard {
  confirmed: number;
  cancelled: number;
  revenueUsd: number;
  lossesUsd: number;
  netUsd: number;
}

export interface PartnerMonthlyPoint {
  month: string;
  revenueUsd: number;
  lossesUsd: number;
  occupancyRate: number;
}

export interface PartnerReservationRow {
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

export interface PartnerMetrics {
  partnerId: string;
  month: string;
  roomType: string | null;
  metrics: PartnerMetricCard;
  monthlySeries: PartnerMonthlyPoint[];
}

export interface PropertyMetrics {
  partnerId: string;
  propertyId: string;
  month: string;
  roomType: string | null;
  metrics: PartnerMetricCard;
  monthlySeries: PartnerMonthlyPoint[];
}

export interface PropertyReservations {
  partnerId: string;
  propertyId: string;
  month: string;
  roomType: string | null;
  reservations: PartnerReservationRow[];
}

export interface PartnerPaymentRow {
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

export interface PartnerPayments {
  partnerId: string;
  month: string | null;
  total: number;
  page: number;
  pageSize: number;
  rows: PartnerPaymentRow[];
}

export async function fetchPartnerMetrics(
  partnerId: string,
  month: string,
  roomType: string | null,
  token: string,
): Promise<PartnerMetrics> {
  const params = new URLSearchParams({ month });
  if (roomType) params.set('roomType', roomType);
  const res = await fetch(
    `${API_BASE}/api/partners/partners/${encodeURIComponent(partnerId)}/metrics?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<PartnerMetrics>;
}

export async function fetchPropertyMetrics(
  partnerId: string,
  propertyId: string,
  month: string,
  roomType: string | null,
  token: string,
): Promise<PropertyMetrics> {
  const params = new URLSearchParams({ month });
  if (roomType) params.set('roomType', roomType);
  const res = await fetch(
    `${API_BASE}/api/partners/partners/${encodeURIComponent(partnerId)}/properties/${encodeURIComponent(propertyId)}/metrics?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<PropertyMetrics>;
}

export async function fetchPropertyReservations(
  partnerId: string,
  propertyId: string,
  month: string,
  roomType: string | null,
  token: string,
): Promise<PropertyReservations> {
  const params = new URLSearchParams({ month });
  if (roomType) params.set('roomType', roomType);
  const res = await fetch(
    `${API_BASE}/api/partners/partners/${encodeURIComponent(partnerId)}/properties/${encodeURIComponent(propertyId)}/reservations?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<PropertyReservations>;
}

export async function fetchPartnerPayments(
  partnerId: string,
  month: string | null,
  page: number,
  pageSize: number,
  token: string,
  propertyId?: string | null,
): Promise<PartnerPayments> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (month) params.set('month', month);
  if (propertyId) params.set('propertyId', propertyId);
  const res = await fetch(
    `${API_BASE}/api/partners/partners/${encodeURIComponent(partnerId)}/payments?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<PartnerPayments>;
}

export interface PartnerPropertySummary {
  propertyId: string;
  propertyName: string;
  propertyCity: string;
  propertyNeighborhood: string | null;
  propertyCountryCode: string;
  propertyThumbnailUrl: string | null;
  roomCount: number;
  reservationCount: number;
}

export interface PartnerPropertiesResponse {
  partnerId: string;
  properties: PartnerPropertySummary[];
}

export interface PartnerMember {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'partner' | 'manager';
  propertyId: string | null;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export async function fetchPartnerMembers(
  partnerId: string,
  token: string,
): Promise<PartnerMember[]> {
  const res = await fetch(
    `${API_BASE}/api/partners/partners/${encodeURIComponent(partnerId)}/members`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<PartnerMember[]>;
}

export async function fetchPartnerProperties(
  partnerId: string,
  token: string,
): Promise<PartnerPropertiesResponse> {
  const res = await fetch(
    `${API_BASE}/api/partners/partners/${encodeURIComponent(partnerId)}/properties`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<PartnerPropertiesResponse>;
}

export async function fetchPartnerProperty(
  partnerId: string,
  propertyId: string,
  token: string,
): Promise<PartnerPropertySummary> {
  const res = await fetch(
    `${API_BASE}/api/partners/partners/${encodeURIComponent(partnerId)}/properties/${encodeURIComponent(propertyId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<PartnerPropertySummary>;
}

// ─── Partner Registration ─────────────────────────────────────────────────────

export interface RegisterPartnerParams {
  orgName: string;
  slug: string;
  firstName: string;
  lastName: string;
  ownerEmail: string;
  ownerPassword: string;
}

export interface PartnerDetails {
  id: string;
  name: string;
  slug: string;
  identifier: string;
  status: string;
}

export async function fetchPartner(
  partnerId: string,
  token: string,
): Promise<PartnerDetails> {
  const res = await fetch(
    `${API_BASE}/api/partners/partners/${encodeURIComponent(partnerId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<PartnerDetails>;
}

export interface RegisterPartnerResponse {
  partner: { id: string; name: string; slug: string; identifier: string };
  challengeId: string;
}

export async function registerPartner(
  params: RegisterPartnerParams,
): Promise<RegisterPartnerResponse> {
  const res = await fetch(`${API_BASE}/api/partners/partners/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    const err = new Error(body.message ?? `HTTP ${res.status}`) as Error & { status: number; body: typeof body };
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return res.json() as Promise<RegisterPartnerResponse>;
}

// ─── Check-in QR ─────────────────────────────────────────────────────────────

export interface CheckinQrResponse {
  partnerId: string;
  propertyId: string;
  checkInKey: string;
}

export async function fetchCheckinQr(
  partnerId: string,
  propertyId: string,
  token: string,
): Promise<CheckinQrResponse> {
  const res = await fetch(
    `${API_BASE}/api/partners/partners/${encodeURIComponent(partnerId)}/properties/${encodeURIComponent(propertyId)}/checkin-publickey`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<CheckinQrResponse>;
}

export async function regenerateCheckinQr(
  partnerId: string,
  propertyId: string,
  token: string,
): Promise<CheckinQrResponse> {
  const res = await fetch(
    `${API_BASE}/api/partners/partners/${encodeURIComponent(partnerId)}/properties/${encodeURIComponent(propertyId)}/checkin-publickey/regenerate`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<CheckinQrResponse>;
}

export async function downloadCheckinPdf(
  partnerId: string,
  propertyId: string,
  token: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/partners/partners/${encodeURIComponent(partnerId)}/properties/${encodeURIComponent(propertyId)}/checkin-publickey/download`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qr-checkin-${propertyId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
