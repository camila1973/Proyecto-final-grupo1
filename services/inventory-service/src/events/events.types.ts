export interface RoomSnapshot {
  roomId: string;
  propertyId: string;
  propertyName: string;
  city: string;
  countryCode: string;
  roomType: string;
  capacity: number;
  totalRooms: number;
  basePriceUsd: number;
  stars: number | null;
}

export interface InventoryRoomUpdatedEvent {
  routingKey: "inventory.room.updated";
  timestamp: string;
  snapshot: RoomSnapshot;
}

export interface InventoryRoomDeletedEvent {
  routingKey: "inventory.room.deleted";
  roomId: string;
  propertyId: string;
  timestamp: string;
}

export interface PriceUpdatedEvent {
  routingKey: "price.updated";
  roomId: string;
  fromDate: string;
  toDate: string;
  priceUsd: number;
  timestamp: string;
}

export interface InventoryImportedEvent {
  routingKey: "inventory.imported";
  propertyId: string;
  roomCount: number;
  rooms: RoomSnapshot[];
}
