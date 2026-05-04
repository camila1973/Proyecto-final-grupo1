import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE reservations
      ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE reservations DROP COLUMN IF EXISTS checked_in_at
  `.execute(db);
}
