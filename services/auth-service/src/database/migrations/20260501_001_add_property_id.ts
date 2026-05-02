import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE auth_users ADD COLUMN property_id TEXT`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE auth_users DROP COLUMN property_id`.execute(db);
}
