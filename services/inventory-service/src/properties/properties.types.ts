export interface CreatePropertyDto {
  partnerId: string;
  name: string;
  type: string;
  city: string;
  stars?: number;
  countryCode: string;
  neighborhood?: string;
  lat?: number;
  lon?: number;
  rating?: number;
  reviewCount?: number;
  thumbnailUrl?: string;
  amenities?: string[];
}

export interface UpdatePropertyDto {
  name?: string;
  type?: string;
  city?: string;
  stars?: number;
  status?: string;
  countryCode?: string;
  neighborhood?: string;
  lat?: number;
  lon?: number;
  rating?: number;
  reviewCount?: number;
  thumbnailUrl?: string;
  amenities?: string[];
}

export interface RoomSummary {
  roomId: string;
  roomType: string;
  bedType: string;
  viewType: string;
  capacity: number;
  basePriceUsd: number;
}

export interface PublicProperty {
  id: string;
  name: string;
  type: string;
  city: string;
  stars: number | null;
  status: string;
  countryCode: string;
  partnerId: string;
  neighborhood: string | null;
  lat: number | null;
  lon: number | null;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  amenities: string[];
  createdAt: Date;
  updatedAt: Date;
  rooms?: RoomSummary[];
}
