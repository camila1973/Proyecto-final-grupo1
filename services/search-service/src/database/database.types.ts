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
  flat_fee_per_night_usd: Generated<string>; // pre-summed FLAT_PER_NIGHT fees for this partner (USD)
  flat_fee_per_stay_usd: Generated<string>; // pre-summed FLAT_PER_STAY fees for this partner (USD)
  stars: number;
  rating: Generated<string>;
  review_count: Generated<number>;
  thumbnail_url: Generated<string>;
  image_urls: Generated<string[]>;
  description: Generated<Record<string, string>>;
  is_active: Generated<boolean>;
  last_synced_at: Generated<string>;
};

export type PropertyReviewsTable = {
  id: Generated<string>;
  property_id: string;
  reviewer_name: string;
  reviewer_country: string | null;
  rating: number;
  language: Generated<string>;
  title: string | null;
  comment: string;
  created_at: Generated<string>;
};

export type RoomPricePeriodsTable = {
  id: Generated<string>;
  room_id: string;
  from_date: string;
  to_date: string;
  price_usd: string;
};

export type SearchDatabase = {
  taxonomy_categories: TaxonomyCategoryTable;
  taxonomy_values: TaxonomyValueTable;
  room_search_index: RoomSearchIndexTable;
  room_price_periods: RoomPricePeriodsTable;
  property_reviews: PropertyReviewsTable;
};
