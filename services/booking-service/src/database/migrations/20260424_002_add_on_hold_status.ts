import type { Kysely } from "kysely";
import { sql } from "kysely";

// Introduces `on_hold` as a distinct status from `pending`:
//   - on_hold  → user is in checkout, inventory locked (15-min window)
//   - pending  → payment submitted to Stripe, awaiting webhook confirmation
//   - confirmed → webhook fired, booking finalized
//   - expired  → hold timed out without payment submission
//
// The partial unique index is moved from `pending` to `on_hold` so that
// a `pending` (payment-submitted) reservation does not block a new hold
// for the same room/dates.
export async function up(db: Kysely<any>): Promise<void> {
  // Change default status for new reservations
  await sql`
    ALTER TABLE reservations ALTER COLUMN status SET DEFAULT 'on_hold'
  `.execute(db);

  // Drop old partial unique index that covered 'pending'
  await sql`
    DROP INDEX IF EXISTS reservations_pending_booker_room_stay_idx
  `.execute(db);

  // New partial unique index covering only 'on_hold' reservations
  await sql`
    CREATE UNIQUE INDEX reservations_on_hold_booker_room_stay_idx
      ON reservations (booker_id, room_id, check_in, check_out)
      WHERE status = 'on_hold'
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE reservations ALTER COLUMN status SET DEFAULT 'pending'
  `.execute(db);

  await sql`
    DROP INDEX IF EXISTS reservations_on_hold_booker_room_stay_idx
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX reservations_pending_booker_room_stay_idx
      ON reservations (booker_id, room_id, check_in, check_out)
      WHERE status = 'pending'
  `.execute(db);
}
