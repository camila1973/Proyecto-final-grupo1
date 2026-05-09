import type { PartnerReservationRow } from '../../../../utils/queries';

const UPCOMING_STATUSES = new Set(['confirmed', 'submitted', 'checked_in']);

export function selectUpcoming(
  reservations: PartnerReservationRow[],
  today: string,
  limit = 4,
): PartnerReservationRow[] {
  return reservations
    .filter((r) => UPCOMING_STATUSES.has(r.status) && r.checkIn >= today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    .slice(0, limit);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
