export interface CreateRoomRateDto {
  partnerId?: string;
  roomId: string;
  fromDate: string; // ISO date YYYY-MM-DD
  toDate: string; // exclusive upper bound
  priceUsd: number;
  currency?: string;
}

export interface PublicRoomRate {
  id: string;
  roomId: string;
  fromDate: string;
  toDate: string;
  priceUsd: string;
  currency: string;
  createdAt: Date;
}
