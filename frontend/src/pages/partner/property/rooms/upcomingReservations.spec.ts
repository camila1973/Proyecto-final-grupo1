import { initials, selectUpcoming } from './upcomingReservations';
import type { PartnerReservationRow } from '../../../../utils/queries';

function res(overrides: Partial<PartnerReservationRow>): PartnerReservationRow {
  return {
    id: overrides.id ?? 'r-' + Math.random().toString(36).slice(2),
    status: overrides.status ?? 'confirmed',
    guestName: overrides.guestName ?? 'Jane Doe',
    guestEmail: 'a@b.com',
    guestPhone: '',
    guestCount: 2,
    checkIn: overrides.checkIn ?? '2026-05-15',
    checkOut: overrides.checkOut ?? '2026-05-18',
    roomType: overrides.roomType ?? 'Doble',
    grandTotalUsd: 200,
    ...overrides,
  };
}

describe('selectUpcoming', () => {
  const today = '2026-05-09';

  it('drops past reservations and non-upcoming statuses', () => {
    const out = selectUpcoming(
      [
        res({ id: '1', checkIn: '2026-05-01' }),
        res({ id: '2', status: 'cancelled', checkIn: '2026-05-20' }),
        res({ id: '3', status: 'confirmed', checkIn: '2026-05-15' }),
      ],
      today,
    );
    expect(out.map((r) => r.id)).toEqual(['3']);
  });

  it('sorts ascending by checkIn and limits to 4 by default', () => {
    const out = selectUpcoming(
      [
        res({ id: 'a', checkIn: '2026-06-01' }),
        res({ id: 'b', checkIn: '2026-05-20' }),
        res({ id: 'c', checkIn: '2026-05-12' }),
        res({ id: 'd', checkIn: '2026-05-25' }),
        res({ id: 'e', checkIn: '2026-05-30' }),
      ],
      today,
    );
    expect(out.map((r) => r.id)).toEqual(['c', 'b', 'd', 'e']);
  });

  it('includes today as upcoming', () => {
    const out = selectUpcoming([res({ id: 'today', checkIn: today })], today);
    expect(out).toHaveLength(1);
  });

  it('keeps submitted and checked_in statuses', () => {
    const out = selectUpcoming(
      [
        res({ id: 'sub', status: 'submitted', checkIn: '2026-05-15' }),
        res({ id: 'in', status: 'checked_in', checkIn: '2026-05-16' }),
      ],
      today,
    );
    expect(out.map((r) => r.id)).toEqual(['sub', 'in']);
  });
});

describe('initials', () => {
  it('returns first letter of first and last name', () => {
    expect(initials('Jane Doe')).toBe('JD');
    expect(initials('jane mary doe')).toBe('JD');
  });

  it('handles single names', () => {
    expect(initials('Cher')).toBe('CH');
  });

  it('handles empty strings', () => {
    expect(initials('   ')).toBe('?');
  });
});
