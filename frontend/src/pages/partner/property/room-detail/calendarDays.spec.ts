import { buildCalendarDays } from './calendarDays';
import type { RoomRatePeriod } from '../../../../utils/queries';

function rate(id: string, fromDate: string, toDate: string, priceUsd: number): RoomRatePeriod {
  return { id, roomId: 'r1', fromDate, toDate, priceUsd, currency: 'USD', createdAt: '2026-05-01' };
}

describe('buildCalendarDays', () => {
  it('matches override on the inclusive start date even when API returns ISO timestamps', () => {
    // Period covers 2026-05-13 → 2026-05-16 (exclusive). Inclusive end = 2026-05-15.
    const rates = [rate('p1', '2026-05-13T00:00:00.000Z', '2026-05-16T00:00:00.000Z', 500)];
    const days = buildCalendarDays('2026-05', [], rates, 320, 3);

    const may12 = days.find((d) => d.date === '2026-05-12')!;
    const may13 = days.find((d) => d.date === '2026-05-13')!;
    const may15 = days.find((d) => d.date === '2026-05-15')!;
    const may16 = days.find((d) => d.date === '2026-05-16')!;

    expect(may12.hasOverride).toBe(false);
    expect(may12.rate).toBe(320);

    expect(may13.hasOverride).toBe(true);
    expect(may13.rate).toBe(500);

    expect(may15.hasOverride).toBe(true);
    expect(may15.rate).toBe(500);

    expect(may16.hasOverride).toBe(false);
    expect(may16.rate).toBe(320);
  });
});
