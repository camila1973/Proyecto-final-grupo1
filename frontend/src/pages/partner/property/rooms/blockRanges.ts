import dayjs from '../../../../utils/dayjs';
import type { RoomAvailabilityDay } from '../../../../utils/queries';

export interface BlockedRange {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
}

export function groupBlockedRuns(days: RoomAvailabilityDay[]): BlockedRange[] {
  const blocked = days
    .filter((d) => d.blocked)
    .map((d) => dayjs.utc(d.date).format('YYYY-MM-DD'))
    .sort((a, b) => a.localeCompare(b));

  const ranges: BlockedRange[] = [];
  let current: BlockedRange | null = null;

  for (const date of blocked) {
    if (!current) {
      current = { from: date, to: date };
      continue;
    }
    const expectedNext = dayjs.utc(current.to).add(1, 'day').format('YYYY-MM-DD');
    if (date === expectedNext) {
      current.to = date;
    } else {
      ranges.push(current);
      current = { from: date, to: date };
    }
  }
  if (current) ranges.push(current);
  return ranges;
}
