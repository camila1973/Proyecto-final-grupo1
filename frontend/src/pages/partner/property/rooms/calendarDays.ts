import dayjs from '../../../../utils/dayjs';
import type { RoomAvailabilityDay, RoomRatePeriod } from '../../../../utils/queries';

export type DayState = 'available' | 'low' | 'sold-out' | 'blocked' | 'default';

export interface CalendarDay {
  date: string;
  avail: RoomAvailabilityDay | undefined;
  rate: number;
  hasOverride: boolean;
  state: DayState;
}

function asDateOnly(value: string): string {
  return dayjs.utc(value).format('YYYY-MM-DD');
}

export function buildCalendarDays(
  month: string,
  availability: RoomAvailabilityDay[],
  rates: RoomRatePeriod[],
  basePriceUsd: number,
  totalRooms: number,
): CalendarDay[] {
  const availMap = new Map(availability.map((a) => [asDateOnly(a.date), a]));
  const ratePeriods = rates.map((r) => ({
    ...r,
    from: asDateOnly(r.fromDate),
    to: asDateOnly(r.toDate),
  }));

  const monthStart = dayjs.utc(`${month}-01`);
  const daysInMonth = monthStart.daysInMonth();
  const days: CalendarDay[] = [];

  for (let d = 0; d < daysInMonth; d++) {
    const date = monthStart.add(d, 'day').format('YYYY-MM-DD');
    const avail = availMap.get(date);

    const period = ratePeriods.find((r) => r.from <= date && date < r.to);
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
