import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE auth_users
      ADD COLUMN IF NOT EXISTS partner_id TEXT
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE auth_users
      DROP COLUMN IF EXISTS partner_id
  `.execute(db);
}
