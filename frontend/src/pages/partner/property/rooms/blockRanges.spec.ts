import { groupBlockedRuns } from './blockRanges';
import type { RoomAvailabilityDay } from '../../../../utils/queries';

function day(date: string, blocked: boolean): RoomAvailabilityDay {
  return {
    date,
    totalRooms: 5,
    reservedRooms: 0,
    heldRooms: 0,
    blocked,
    available: !blocked,
  };
}

describe('groupBlockedRuns', () => {
  it('returns empty array when there are no days', () => {
    expect(groupBlockedRuns([])).toEqual([]);
  });

  it('returns empty array when no day is blocked', () => {
    expect(groupBlockedRuns([day('2026-05-10', false), day('2026-05-11', false)])).toEqual([]);
  });

  it('returns a single-day range when only one day is blocked', () => {
    expect(
      groupBlockedRuns([day('2026-05-10', false), day('2026-05-11', true), day('2026-05-12', false)]),
    ).toEqual([{ from: '2026-05-11', to: '2026-05-11' }]);
  });

  it('collapses contiguous blocked days into one range', () => {
    expect(
      groupBlockedRuns([
        day('2026-05-10', true),
        day('2026-05-11', true),
        day('2026-05-12', true),
      ]),
    ).toEqual([{ from: '2026-05-10', to: '2026-05-12' }]);
  });

  it('splits non-contiguous blocked days into multiple ranges', () => {
    expect(
      groupBlockedRuns([
        day('2026-05-10', true),
        day('2026-05-11', true),
        day('2026-05-13', true),
        day('2026-05-14', true),
        day('2026-05-20', true),
      ]),
    ).toEqual([
      { from: '2026-05-10', to: '2026-05-11' },
      { from: '2026-05-13', to: '2026-05-14' },
      { from: '2026-05-20', to: '2026-05-20' },
    ]);
  });

  it('sorts unsorted input before grouping', () => {
    expect(
      groupBlockedRuns([
        day('2026-05-12', true),
        day('2026-05-10', true),
        day('2026-05-11', true),
      ]),
    ).toEqual([{ from: '2026-05-10', to: '2026-05-12' }]);
  });

  it('handles ISO timestamp date inputs', () => {
    expect(
      groupBlockedRuns([
        { ...day('2026-05-10T00:00:00.000Z', true) },
        { ...day('2026-05-11T00:00:00.000Z', true) },
      ]),
    ).toEqual([{ from: '2026-05-10', to: '2026-05-11' }]);
  });
});
