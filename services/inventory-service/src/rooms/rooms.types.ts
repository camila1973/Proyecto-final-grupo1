export interface CreateRoomDto {
  propertyId: string;
  roomType: string;
  bedType?: string;
  viewType?: string;
  capacity: number;
  totalRooms: number;
  basePriceUsd: number;
}

export interface UpdateRoomDto {
  roomType?: string;
  bedType?: string;
  viewType?: string;
  capacity?: number;
  totalRooms?: number;
  basePriceUsd?: number;
  status?: string;
}

export interface PublicRoom {
  id: string;
  propertyId: string;
  roomType: string;
  bedType: string;
  viewType: string;
  capacity: number;
  totalRooms: number;
  basePriceUsd: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
