import type { Kysely } from "kysely";
import { sql } from "kysely";

// Use Kysely<any> — migrations are frozen in time and must not depend on
// application types that can change between versions.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS btree_gist`.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS inv_properties (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name         TEXT        NOT NULL,
      type         TEXT        NOT NULL,
      city         TEXT        NOT NULL,
      stars        INTEGER     CHECK (stars BETWEEN 1 AND 5),
      status       TEXT        NOT NULL DEFAULT 'active',
      country_code TEXT        NOT NULL,
      partner_id   UUID        NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS inv_rooms (
      id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id    UUID          NOT NULL REFERENCES inv_properties(id) ON DELETE CASCADE,
      room_type      TEXT          NOT NULL,
      capacity       INTEGER       NOT NULL,
      total_rooms    INTEGER       NOT NULL,
      base_price_usd NUMERIC(12,2) NOT NULL,
      status         TEXT          NOT NULL DEFAULT 'active',
      created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_inv_rooms_property_id
    ON inv_rooms(property_id)
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS inv_room_rates (
      id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id    UUID          NOT NULL REFERENCES inv_rooms(id) ON DELETE CASCADE,
      from_date  DATE          NOT NULL,
      to_date    DATE          NOT NULL,
      price_usd  NUMERIC(12,2) NOT NULL,
      currency   TEXT          NOT NULL DEFAULT 'USD',
      created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      EXCLUDE USING gist (room_id WITH =, daterange(from_date, to_date) WITH &&)
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_inv_room_rates_room_date
    ON inv_room_rates(room_id, from_date, to_date)
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS inv_availability (
      room_id        UUID    NOT NULL REFERENCES inv_rooms(id) ON DELETE CASCADE,
      date           DATE    NOT NULL,
      total_rooms    INTEGER,
      reserved_rooms INTEGER NOT NULL DEFAULT 0,
      held_rooms     INTEGER NOT NULL DEFAULT 0,
      blocked        BOOLEAN NOT NULL DEFAULT false,
      PRIMARY KEY (room_id, date)
    )
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS inv_availability`.execute(db);
  await sql`DROP TABLE IF EXISTS inv_room_rates`.execute(db);
  await sql`DROP TABLE IF EXISTS inv_rooms`.execute(db);
  await sql`DROP TABLE IF EXISTS inv_properties`.execute(db);
}
