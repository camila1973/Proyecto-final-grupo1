import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE managers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      user_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);
  await sql`CREATE INDEX ON managers (partner_id)`.execute(db);
  await sql`CREATE INDEX ON managers (property_id)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE managers`.execute(db);
}
