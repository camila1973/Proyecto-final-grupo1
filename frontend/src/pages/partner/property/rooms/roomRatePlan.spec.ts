import { formatRatePeriodRange, groupRatePeriods } from './roomRatePlan';
import type { RoomRatePeriod } from '../../../../utils/queries';

function period(id: string, fromDate: string, toDate: string, priceUsd: number): RoomRatePeriod {
  return { id, roomId: 'r1', fromDate, toDate, priceUsd, currency: 'USD', createdAt: '2026-05-01' };
}

describe('groupRatePeriods', () => {
  it('always includes a base row first', () => {
    const rows = groupRatePeriods([], 120);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'base', priceUsd: 120, fromDate: null, toDate: null });
  });

  it('appends overrides sorted ascending by fromDate', () => {
    const rows = groupRatePeriods(
      [period('p2', '2026-05-20', '2026-05-25', 200), period('p1', '2026-05-10', '2026-05-15', 180)],
      120,
    );
    expect(rows.map((r) => r.key)).toEqual(['base', 'p1', 'p2']);
    expect(rows[1]).toMatchObject({ kind: 'override', priceUsd: 180, fromDate: '2026-05-10' });
  });

  it('does not mutate the input array', () => {
    const periods = [period('p2', '2026-05-20', '2026-05-25', 200), period('p1', '2026-05-10', '2026-05-15', 180)];
    const before = periods.map((p) => p.id);
    groupRatePeriods(periods, 120);
    expect(periods.map((p) => p.id)).toEqual(before);
  });

  it("filters out the inventory-service synthetic 'base' fallback row", () => {
    // inventory-service returns a synthetic {id:'base'} row when a room has zero real rate periods.
    // It is not a user-defined override and must not appear as an extra row in the rate plan.
    const rows = groupRatePeriods(
      [period('base', '2026-05-01', '2026-06-01', 320), period('p1', '2026-05-13', '2026-05-16', 500)],
      320,
    );
    expect(rows.map((r) => r.key)).toEqual(['base', 'p1']);
    expect(rows[0].kind).toBe('base');
    expect(rows[1].kind).toBe('override');
  });
});

describe('formatRatePeriodRange', () => {
  it('strips the time component and converts exclusive toDate to inclusive', () => {
    expect(formatRatePeriodRange('2026-05-13T00:00:00.000Z', '2026-05-16T00:00:00.000Z')).toEqual({
      from: '2026-05-13',
      to: '2026-05-15',
    });
  });

  it('handles already-stripped YYYY-MM-DD inputs', () => {
    expect(formatRatePeriodRange('2026-05-13', '2026-05-16')).toEqual({
      from: '2026-05-13',
      to: '2026-05-15',
    });
  });

  it('handles single-day overrides (toDate = fromDate + 1)', () => {
    expect(formatRatePeriodRange('2026-05-13', '2026-05-14')).toEqual({
      from: '2026-05-13',
      to: '2026-05-13',
    });
  });
});
