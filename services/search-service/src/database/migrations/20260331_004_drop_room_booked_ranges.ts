import type { Kysely } from "kysely";
import { sql } from "kysely";

// Removes room_booked_ranges from search-service.
// Availability is no longer maintained locally — search-service queries
// inventory-service at runtime for live availability data.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS room_booked_ranges`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS room_booked_ranges (
      id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id    UUID  NOT NULL REFERENCES room_search_index(room_id) ON DELETE CASCADE,
      from_date  DATE  NOT NULL,
      to_date    DATE  NOT NULL,
      CHECK (to_date > from_date)
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_booked_ranges_room_dates
    ON room_booked_ranges
    USING GIST (room_id, daterange(from_date, to_date, '[)'))
  `.execute(db);
}
