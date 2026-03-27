import type { Kysely } from "kysely";
import { sql } from "kysely";

// Use Kysely<any> — migrations are frozen in time and must not depend on
// application types that can change between versions.
export async function up(db: Kysely<any>): Promise<void> {
  // Drop the old availability-windows table (replaced by two focused tables).
  await sql`DROP TABLE IF EXISTS room_availability`.execute(db);

  // room_booked_ranges — one row per booking hold/confirmed reservation.
  // A room is available by default; it is excluded from search results only
  // when a booked range overlaps the requested check-in/check-out window.
  await sql`
    CREATE TABLE IF NOT EXISTS room_booked_ranges (
      id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id    UUID  NOT NULL REFERENCES room_search_index(room_id) ON DELETE CASCADE,
      from_date  DATE  NOT NULL,
      to_date    DATE  NOT NULL,
      CHECK (to_date > from_date)
    )
  `.execute(db);

  // GiST index enables fast overlap queries using the && operator on daterange.
  await sql`
    CREATE INDEX IF NOT EXISTS idx_booked_ranges_room_dates
    ON room_booked_ranges
    USING GIST (room_id, daterange(from_date, to_date, '[)'))
  `.execute(db);

  // room_price_periods — seasonal pricing rows.
  // Rows may overlap; the search query picks the lowest applicable price.
  // Rooms without a matching period fall back to base_price_usd.
  await sql`
    CREATE TABLE IF NOT EXISTS room_price_periods (
      id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id    UUID           NOT NULL REFERENCES room_search_index(room_id) ON DELETE CASCADE,
      from_date  DATE           NOT NULL,
      to_date    DATE           NOT NULL,
      price_usd  NUMERIC(10,2)  NOT NULL,
      CHECK (to_date > from_date)
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_price_periods_room_dates
    ON room_price_periods (room_id, from_date, to_date)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS room_price_periods`.execute(db);
  await sql`DROP TABLE IF EXISTS room_booked_ranges`.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS room_availability (
      room_id    UUID           NOT NULL REFERENCES room_search_index(room_id) ON DELETE CASCADE,
      from_date  DATE           NOT NULL,
      to_date    DATE           NOT NULL,
      price_usd  NUMERIC(10,2)  NOT NULL,
      PRIMARY KEY (room_id, from_date)
    )
  `.execute(db);
}
