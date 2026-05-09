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
  phone?: string;
  email?: string;
  address?: string;
  currency?: string;
  timezone?: string;
  description?: string;
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
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  currency?: string | null;
  timezone?: string | null;
  description?: string | null;
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
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string | null;
  timezone: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  rooms?: RoomSummary[];
}
