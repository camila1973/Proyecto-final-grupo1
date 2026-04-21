import type { Kysely } from "kysely";
import { sql } from "kysely";

// Extends the search index with multimedia + descriptions for the property
// detail view, and introduces a dedicated reviews table for pagination.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE room_search_index
      ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}'
  `.execute(db);

  // description is a JSONB map keyed by ISO-639-1 language code
  //   e.g. { "es": "Hotel muy bien situado...", "en": "Hotel very well situated..." }
  await sql`
    ALTER TABLE room_search_index
      ADD COLUMN IF NOT EXISTS description JSONB NOT NULL DEFAULT '{}'::jsonb
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS property_reviews (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id     UUID        NOT NULL,
      reviewer_name   TEXT        NOT NULL,
      reviewer_country TEXT,
      rating          SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
      language        TEXT        NOT NULL DEFAULT 'es',
      title           TEXT,
      comment         TEXT        NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  // Paginated-by-newest queries for a single property
  await sql`
    CREATE INDEX IF NOT EXISTS idx_property_reviews_property_created
    ON property_reviews (property_id, created_at DESC)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS property_reviews`.execute(db);
  await sql`ALTER TABLE room_search_index DROP COLUMN IF EXISTS description`.execute(
    db,
  );
  await sql`ALTER TABLE room_search_index DROP COLUMN IF EXISTS image_urls`.execute(
    db,
  );
}
