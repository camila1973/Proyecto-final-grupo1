import type { Kysely } from "kysely";
import { sql } from "kysely";

// Use Kysely<any> — migrations are frozen in time and must not depend on
// application types that can change between versions.
export async function up(db: Kysely<any>): Promise<void> {
  // auth_users
  await sql`
    CREATE TABLE IF NOT EXISTS auth_users (
      id            TEXT        PRIMARY KEY,
      email         TEXT        UNIQUE NOT NULL,
      role          TEXT        NOT NULL,
      password_hash TEXT        NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  // auth_login_challenges
  await sql`
    CREATE TABLE IF NOT EXISTS auth_login_challenges (
      id            TEXT        PRIMARY KEY,
      user_id       TEXT        NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      otp_code_hash TEXT        NOT NULL,
      attempts      INTEGER     NOT NULL DEFAULT 0,
      expires_at    TIMESTAMPTZ NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  // Index for expiry-based cleanup and lookups
  await sql`
    CREATE INDEX IF NOT EXISTS idx_auth_login_challenges_expires_at
    ON auth_login_challenges (expires_at)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS auth_login_challenges`.execute(db);
  await sql`DROP TABLE IF EXISTS auth_users`.execute(db);
}
