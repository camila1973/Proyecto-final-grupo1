export type SortOption =
  | "price_asc"
  | "price_desc"
  | "stars_desc"
  | "relevance";

export interface SearchPropertiesDto {
  city: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  page: number;
  pageSize: number;
  sort: SortOption;
  roomType?: string[];
  bedType?: string[];
  viewType?: string[];
  amenities?: string[];
  stars?: number[];
  priceMin?: number;
  priceMax?: number;
  exact?: boolean;
}
