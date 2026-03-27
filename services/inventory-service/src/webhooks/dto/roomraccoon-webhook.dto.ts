export interface RoomRaccoonAvailabilityUpdate {
  roomId: string;
  date: string; // YYYY-MM-DD
  available: boolean;
  price: number;
  currency: string;
}

export interface RoomRaccoonWebhookDto {
  hotelId: string;
  provider: "roomraccoon";
  eventType: string;
  occurredAt: string; // ISO 8601
  availability: RoomRaccoonAvailabilityUpdate[];
}
