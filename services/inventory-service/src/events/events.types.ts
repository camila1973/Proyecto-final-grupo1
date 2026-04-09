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
