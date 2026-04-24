import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE auth_users
      ADD COLUMN IF NOT EXISTS first_name TEXT,
      ADD COLUMN IF NOT EXISTS last_name  TEXT,
      ADD COLUMN IF NOT EXISTS phone      TEXT
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE auth_users
      DROP COLUMN IF EXISTS first_name,
      DROP COLUMN IF EXISTS last_name,
      DROP COLUMN IF EXISTS phone
  `.execute(db);
}
