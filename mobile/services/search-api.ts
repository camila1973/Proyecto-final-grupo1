const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface SearchParams {
  city: string;
  checkIn?: string;
  checkOut?: string;
  guests: number;
  page?: number;
  pageSize?: number;
}

export interface PropertyResult {
  roomId: string;
  roomType: string;
  bedType: string;
  viewType: string;
  capacity: number;
  basePriceUsd: number;
  priceUsd: number | null;
  taxRatePct: number;
  estimatedTotalUsd: number;
  hasFlatFees: boolean;
  property: {
    id: string;
    name: string;
    city: string;
    countryCode: string;
    neighborhood: string | null;
    stars: number;
    rating: number;
    reviewCount: number;
    thumbnailUrl: string;
    amenities: string[];
  };
}

export interface SearchResponse {
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    searchId: string;
  };
  results: PropertyResult[];
}

export interface CitySuggestion {
  id: string;
  city: string;
  country: string;
}

export async function searchProperties(params: SearchParams): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  qs.set('city', params.city);
  qs.set('guests', String(params.guests));
  if (params.checkIn) qs.set('checkIn', params.checkIn);
  if (params.checkOut) qs.set('checkOut', params.checkOut);
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.pageSize ?? 20));

  const res = await fetch(`${API_BASE}/api/search/properties?${qs.toString()}`);
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }
  return res.json() as Promise<SearchResponse>;
}

export async function getFeatured(limit = 6): Promise<{ results: PropertyResult[] }> {
  const res = await fetch(`${API_BASE}/api/search/featured?limit=${limit}`);
  if (!res.ok) {
    throw new Error(`Featured fetch failed: ${res.status}`);
  }
  return res.json() as Promise<{ results: PropertyResult[] }>;
}

export async function getCitySuggestions(q: string): Promise<CitySuggestion[]> {
  if (!q.trim()) return [];
  const res = await fetch(`${API_BASE}/api/search/cities?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = await res.json() as { suggestions: CitySuggestion[] };
  return data.suggestions ?? [];
}
