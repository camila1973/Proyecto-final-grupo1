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

export type ReservationStatus = 'on_hold' | 'pending' | 'confirmed' | 'expired' | 'cancelled';

export interface ReservationListItem {
  id: string;
  status: ReservationStatus;
  checkIn: string;
  checkOut: string;
  grandTotalUsd: number;
  createdAt: string;
  property: {
    id: string;
    name: string;
    address: string;
    thumbnailUrl: string | null;
  } | null;
  room: {
    roomType: string;
  } | null;
}

export async function fetchMyReservations(token: string): Promise<ReservationListItem[]> {
  const res = await fetch(`${API_BASE}/api/booking/reservations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { reservations?: ReservationListItem[] } | ReservationListItem[];
  return Array.isArray(data) ? data : (data.reservations ?? []);
}

export async function cancelReservation(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/booking/reservations/${id}/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
