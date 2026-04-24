import type { Kysely } from "kysely";
import { sql } from "kysely";

// Prevents duplicate pending reservations for the same booker/room/stay
// caused by concurrent requests (e.g. React StrictMode double-invoke).
// Partial index only covers status = 'pending' so expired/confirmed rows
// don't block re-booking the same combination.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE UNIQUE INDEX reservations_pending_booker_room_stay_idx
      ON reservations (booker_id, room_id, check_in, check_out)
      WHERE status = 'pending'
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS reservations_pending_booker_room_stay_idx
  `.execute(db);
}
