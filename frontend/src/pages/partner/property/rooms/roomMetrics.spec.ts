import { computeOccupancy } from './roomMetrics';
import type { RoomAvailabilityDay } from '../../../../utils/queries';

function day(reserved: number, total = 5, blocked = false, held = 0): RoomAvailabilityDay {
  return {
    date: '2026-05-01',
    totalRooms: total,
    reservedRooms: reserved,
    heldRooms: held,
    blocked,
    available: total - reserved - held > 0,
  };
}

describe('computeOccupancy', () => {
  it('returns zeros when there are no days', () => {
    expect(computeOccupancy([])).toEqual({ occupancy: 0, soldRooms: 0, totalRoomNights: 0 });
  });

  it('sums reserved over total across days', () => {
    const r = computeOccupancy([day(2), day(3), day(5)]);
    expect(r.soldRooms).toBe(10);
    expect(r.totalRoomNights).toBe(15);
    expect(r.occupancy).toBeCloseTo(10 / 15, 5);
  });

  it('returns occupancy 0 when totalRoomNights is 0', () => {
    const r = computeOccupancy([day(0, 0)]);
    expect(r.occupancy).toBe(0);
  });

  it('ignores held rooms (reserved is the canonical sold count)', () => {
    const r = computeOccupancy([day(2, 5, false, 1)]);
    expect(r.soldRooms).toBe(2);
    expect(r.totalRoomNights).toBe(5);
  });

  it('caps occupancy at 1 when reserved equals total', () => {
    const r = computeOccupancy([day(5, 5)]);
    expect(r.occupancy).toBe(1);
  });
});
