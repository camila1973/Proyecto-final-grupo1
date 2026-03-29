export interface WebhookResult {
  processed: number;
  durationMs: number;
  skipped?: number;
}

export interface HotelbedsWebhookDto {
  hotelCode: string;
  provider: string;
  timestamp: string;
  rooms: HotelbedsRoomAvailability[];
}

export interface HotelbedsRoomAvailability {
  roomCode: string;
  date: string;
  allotment: number;
  rate?: number;
  currency?: string;
  stopSell: boolean;
}

export interface TravelClickWebhookDto {
  propertyCode: string;
  provider: string;
  transactionId: string;
  createdAt: string;
  roomTypes: TravelClickRoomType[];
}

export interface TravelClickRoomType {
  roomTypeCode: string;
  startDate: string;
  endDate: string;
  availableCount: number;
  rateAmount?: number;
  currencyCode?: string;
  closed: boolean;
}

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
