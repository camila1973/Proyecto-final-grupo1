import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE property_check_in_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      check_in_key TEXT NOT NULL UNIQUE,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (partner_id, property_id)
    )
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE property_check_in_keys`.execute(db);
}
