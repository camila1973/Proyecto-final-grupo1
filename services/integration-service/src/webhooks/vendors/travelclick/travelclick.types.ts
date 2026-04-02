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
