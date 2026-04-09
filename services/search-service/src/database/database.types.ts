import type { Generated } from "kysely";

export type TaxonomyCategoryTable = {
  id: Generated<string>;
  code: string;
  label: string;
  filter_type: string;
  display_order: Generated<number>;
  is_active: Generated<boolean>;
  created_at: Generated<string>;
};

export type TaxonomyValueTable = {
  id: Generated<string>;
  category_id: string;
  code: string;
  label: string;
  display_order: Generated<number>;
  is_active: Generated<boolean>;
  created_at: Generated<string>;
};

export type RoomSearchIndexTable = {
  room_id: string;
  property_id: string;
  partner_id: string;
  property_name: string;
  city: string;
  country: string;
  neighborhood: string | null;
  lat: number;
  lon: number;
  room_type: string;
  bed_type: string;
  view_type: string;
  capacity: number;
  amenities: string[];
  base_price_usd: string;
  tax_rate_pct: Generated<string>; // pre-summed percentage rate for this location (e.g. 27.0 for Colombia)
  stars: number;
  rating: Generated<string>;
  review_count: Generated<number>;
  thumbnail_url: Generated<string>;
  is_active: Generated<boolean>;
  last_synced_at: Generated<string>;
};

export type RoomPricePeriodsTable = {
  id: Generated<string>;
  room_id: string;
  from_date: string;
  to_date: string;
  price_usd: string;
};

export type TaxRateCacheTable = {
  country: string;
  city: string;
  total_pct: string; // NUMERIC returned as string by pg
  updated_at: Generated<string>;
};

export type PartnerFeesCacheTable = {
  id: string;
  partner_id: string;
  property_id: string | null;
  fee_name: string;
  fee_type: string;
  rate: string | null;
  flat_amount: string | null;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
};

export type SearchDatabase = {
  taxonomy_categories: TaxonomyCategoryTable;
  taxonomy_values: TaxonomyValueTable;
  room_search_index: RoomSearchIndexTable;
  room_price_periods: RoomPricePeriodsTable;
  tax_rate_cache: TaxRateCacheTable;
  partner_fees_cache: PartnerFeesCacheTable;
};
