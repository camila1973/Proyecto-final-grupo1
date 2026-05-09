import type { RoomAvailabilityDay } from '../../../../utils/queries';

export interface OccupancyResult {
  occupancy: number;
  soldRooms: number;
  totalRoomNights: number;
}

export function computeOccupancy(days: RoomAvailabilityDay[]): OccupancyResult {
  let soldRooms = 0;
  let totalRoomNights = 0;
  for (const d of days) {
    soldRooms += d.reservedRooms;
    totalRoomNights += d.totalRooms;
  }
  const occupancy = totalRoomNights > 0 ? soldRooms / totalRoomNights : 0;
  return { occupancy, soldRooms, totalRoomNights };
}
