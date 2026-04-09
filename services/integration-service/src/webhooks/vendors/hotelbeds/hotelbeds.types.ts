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
