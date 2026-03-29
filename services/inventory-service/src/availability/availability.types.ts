export interface AvailabilityDayDto {
  date: string;
  totalRooms: number;
  reservedRooms: number;
  heldRooms: number;
  blocked: boolean;
  available: boolean;
}

export interface BlockDatesDto {
  roomId: string;
  fromDate: string;
  toDate: string;
}

export interface ReduceCapacityDto {
  roomId: string;
  fromDate: string;
  toDate: string;
  totalRooms: number;
}

export interface BulkAvailabilityResult {
  roomId: string;
  available: boolean;
}
