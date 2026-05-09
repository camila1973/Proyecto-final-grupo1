import dayjs from '../../../../utils/dayjs';
import type { RoomRatePeriod } from '../../../../utils/queries';

export interface RatePlanRow {
  key: string;
  kind: 'base' | 'override';
  priceUsd: number;
  fromDate: string | null;
  toDate: string | null;
}

export function groupRatePeriods(periods: RoomRatePeriod[], basePriceUsd: number): RatePlanRow[] {
  const overrides: RatePlanRow[] = periods
    .filter((p) => p.id !== 'base')
    .slice()
    .sort((a, b) => a.fromDate.localeCompare(b.fromDate))
    .map((p) => ({
      key: p.id,
      kind: 'override',
      priceUsd: p.priceUsd,
      fromDate: p.fromDate,
      toDate: p.toDate,
    }));

  const base: RatePlanRow = {
    key: 'base',
    kind: 'base',
    priceUsd: basePriceUsd,
    fromDate: null,
    toDate: null,
  };

  return [base, ...overrides];
}

/**
 * The API stores `toDate` as exclusive (period covers `[fromDate, toDate)`).
 * For display we want an inclusive range that matches what the user picked
 * on the calendar.
 */
export function formatRatePeriodRange(fromDate: string, toDate: string): { from: string; to: string } {
  return {
    from: dayjs.utc(fromDate).format('YYYY-MM-DD'),
    to: dayjs.utc(toDate).subtract(1, 'day').format('YYYY-MM-DD'),
  };
}
