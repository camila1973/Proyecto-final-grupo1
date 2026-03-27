export interface TravelClickRoomType {
  roomTypeCode: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  availableCount: number;
  rateAmount: number;
  currencyCode: string;
  closed: boolean;
}

export interface TravelClickWebhookDto {
  propertyCode: string;
  provider: "travelclick";
  transactionId: string;
  createdAt: string; // ISO 8601
  roomTypes: TravelClickRoomType[];
}
