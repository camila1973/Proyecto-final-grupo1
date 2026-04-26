import type { Kysely } from "kysely";
import { sql } from "kysely";

// Adds a `reason` TEXT column to reservations to capture context for terminal
// states — `failed` (system-driven, e.g. payment failure) and `cancelled`
// (user-initiated). Nullable: only populated when the reservation terminates
// with an explicit reason.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE reservations ADD COLUMN reason TEXT
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE reservations DROP COLUMN reason
  `.execute(db);
}
