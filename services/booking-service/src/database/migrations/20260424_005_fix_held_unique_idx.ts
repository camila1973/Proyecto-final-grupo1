import type { Kysely } from "kysely";
import { sql } from "kysely";

// Migration 001 created reservations_pending_booker_room_stay_idx with
// WHERE status = 'pending'. After migration 004 renamed that status to
// 'held', the index no longer covers any rows. Drop and recreate it
// pointing at the new status name so the idempotency guard still works.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS reservations_pending_booker_room_stay_idx
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX reservations_held_booker_room_stay_idx
      ON reservations (booker_id, room_id, check_in, check_out)
      WHERE status = 'held'
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS reservations_held_booker_room_stay_idx
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX reservations_pending_booker_room_stay_idx
      ON reservations (booker_id, room_id, check_in, check_out)
      WHERE status = 'pending'
  `.execute(db);
}
