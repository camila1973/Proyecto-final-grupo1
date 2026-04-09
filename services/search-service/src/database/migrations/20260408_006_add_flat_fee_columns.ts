import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE room_search_index
      ADD COLUMN IF NOT EXISTS flat_fee_per_night_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS flat_fee_per_stay_usd  NUMERIC(12,2) NOT NULL DEFAULT 0
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE room_search_index
      DROP COLUMN IF EXISTS flat_fee_per_night_usd,
      DROP COLUMN IF EXISTS flat_fee_per_stay_usd
  `.execute(db);
}
