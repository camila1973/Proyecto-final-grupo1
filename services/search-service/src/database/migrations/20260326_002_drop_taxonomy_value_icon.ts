import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE taxonomy_values DROP COLUMN IF EXISTS icon`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE taxonomy_values ADD COLUMN icon TEXT`.execute(db);
}
