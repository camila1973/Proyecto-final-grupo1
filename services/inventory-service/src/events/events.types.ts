export interface RoomSnapshot {
  roomId: string;
  propertyId: string;
  partnerId: string;
  propertyName: string;
  city: string;
  country: string;
  neighborhood: string | null;
  lat: number | null;
  lon: number | null;
  roomType: string;
  bedType: string;
  viewType: string;
  capacity: number;
  totalRooms: number;
  basePriceUsd: number;
  amenities: string[];
  stars: number | null;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  /** CloudFront/S3 URLs for the image carousel — may be empty while an
   *  inventory property has not yet been synced with media metadata. */
  imageUrls?: string[];
  /** i18n-keyed description map (ISO-639-1 → text). Optional for the same
   *  reason as imageUrls. */
  description?: Record<string, string>;
  isActive: boolean;
}

export interface InventoryRoomUpdatedEvent {
  routingKey: "inventory.room.upserted";
  timestamp: string;
  snapshot: RoomSnapshot;
}

export interface InventoryRoomDeletedEvent {
  routingKey: "inventory.room.deleted";
  roomId: string;
  propertyId: string;
  timestamp: string;
}

export interface InventoryPriceUpdatedEvent {
  routingKey: "inventory.price.updated";
  roomId: string;
  pricePeriods: Array<{ fromDate: string; toDate: string; priceUsd: number }>;
  timestamp: string;
}
