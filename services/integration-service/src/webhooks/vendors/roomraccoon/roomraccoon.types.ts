export interface RoomRaccoonWebhookDto {
  hotelId: string;
  provider: string;
  eventType: string;
  occurredAt: string;
  availability: RoomRaccoonAvailabilityUpdate[];
}

export interface RoomRaccoonAvailabilityUpdate {
  roomId: string;
  date: string;
  available: boolean;
  price?: number;
  currency?: string;
}
