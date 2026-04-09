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

export interface SearchResult {
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
