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
  stars: number;
  rating: Generated<string>;
  review_count: Generated<number>;
  thumbnail_url: Generated<string>;
  is_active: Generated<boolean>;
  last_synced_at: Generated<string>;
};

export type RoomAvailabilityTable = {
  room_id: string;
  from_date: string;
  to_date: string;
  price_usd: string;
};

export type SearchDatabase = {
  taxonomy_categories: TaxonomyCategoryTable;
  taxonomy_values: TaxonomyValueTable;
  room_search_index: RoomSearchIndexTable;
  room_availability: RoomAvailabilityTable;
};
