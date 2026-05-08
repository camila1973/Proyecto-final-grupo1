import type { RoomAvailabilityDay, RoomRatePeriod } from '../../../../utils/queries';

export type DayState = 'available' | 'low' | 'sold-out' | 'blocked' | 'default';

export interface CalendarDay {
  date: string;
  avail: RoomAvailabilityDay | undefined;
  rate: number;
  hasOverride: boolean;
  state: DayState;
}

export function buildCalendarDays(
  month: string,
  availability: RoomAvailabilityDay[],
  rates: RoomRatePeriod[],
  basePriceUsd: number,
  totalRooms: number,
): CalendarDay[] {
  const availMap = new Map(availability.map((a) => [a.date.slice(0, 10), a]));

  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days: CalendarDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const date = `${y}-${mm}-${dd}`;
    const avail = availMap.get(date);

    const period = rates.find((r) => r.fromDate <= date && date < r.toDate);
    const rate = period ? period.priceUsd : basePriceUsd;
    const hasOverride = !!period && period.id !== 'base';

    let state: DayState = 'default';
    if (avail) {
      if (avail.blocked) {
        state = 'blocked';
      } else {
        const free = avail.totalRooms - avail.reservedRooms - avail.heldRooms;
        if (free <= 0) state = 'sold-out';
        else if (free <= Math.ceil(avail.totalRooms * 0.2)) state = 'low';
        else state = 'available';
      }
    } else {
      state = totalRooms > 0 ? 'available' : 'default';
    }

    days.push({ date, avail, rate, hasOverride, state });
  }

  return days;
}
