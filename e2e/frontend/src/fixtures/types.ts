// Mirrors frontend/src/utils/queries.ts — kept in sync manually.
// Avoids importing from the app bundle (no path aliases in plain TS e2e project).

export interface PartnerReservationRow {
  id: string;
  status: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCount: number;
  checkIn: string;
  checkOut: string;
  roomType: string;
  grandTotalUsd: number | null;
}
