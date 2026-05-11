import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS device_tokens (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     TEXT NOT NULL,
      token       TEXT NOT NULL,
      platform    TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS device_tokens_user_token_idx
    ON device_tokens (user_id, token)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS device_tokens`.execute(db);
}
