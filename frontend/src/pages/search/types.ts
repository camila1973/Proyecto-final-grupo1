export interface TaxonomyValue {
  id: string;
  code: string;
  label: string;
  displayOrder: number;
}

export interface TaxonomyCategory {
  id: string;
  code: string;
  label: string;
  filterType: string;
  displayOrder: number;
  values: TaxonomyValue[];
}

export interface TaxonomyResponse {
  categories: TaxonomyCategory[];
}

// code → label lookup built from taxonomy API response
export type LabelMap = Record<string, string>;

export interface BestRoom {
  roomId: string;
  roomType: string;
  bedType: string;
  capacity: number;
  basePriceUsd: number;
  priceUsd: number | null;
}

export interface SearchResult {
  propertyId: string;
  propertyName: string;
  city: string;
  country: string;
  neighborhood: string | null;
  thumbnailUrl: string;
  amenities: string[];
  stars: number;
  rating: number;
  reviewCount: number;
  bestRoom: BestRoom;
}

export interface FacetItem {
  id: string | number;
  count: number;
}

export interface SearchResponse {
  meta: { total: number; page: number; pageSize: number; totalPages: number };
  results: SearchResult[];
  facets: {
    roomTypes: FacetItem[];
    amenities: FacetItem[];
    priceRange: { min: number; max: number; currency: string };
  };
}
