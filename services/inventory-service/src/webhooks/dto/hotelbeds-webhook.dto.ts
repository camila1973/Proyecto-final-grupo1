export interface HotelbedsRoomAvailability {
  roomCode: string;
  date: string; // YYYY-MM-DD
  allotment: number;
  rate: number;
  currency: string;
  stopSell: boolean;
}

export interface HotelbedsWebhookDto {
  hotelCode: string;
  provider: 'hotelbeds';
  timestamp: string; // ISO 8601
  rooms: HotelbedsRoomAvailability[];
}
