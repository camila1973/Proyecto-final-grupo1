import type { Kysely } from "kysely";
import { sql } from "kysely";

// Use Kysely<any> — migrations are frozen in time and must not depend on
// application types that can change between versions.
export async function up(db: Kysely<any>): Promise<void> {
  // Extensions
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`.execute(db);
  await sql`CREATE EXTENSION IF NOT EXISTS btree_gist`.execute(db);

  // taxonomy_categories
  await sql`
    CREATE TABLE IF NOT EXISTS taxonomy_categories (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      code         TEXT        UNIQUE NOT NULL,
      label        TEXT        NOT NULL,
      filter_type  TEXT        NOT NULL,
      display_order INTEGER    NOT NULL DEFAULT 0,
      is_active    BOOLEAN     NOT NULL DEFAULT true,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  // taxonomy_values
  await sql`
    CREATE TABLE IF NOT EXISTS taxonomy_values (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id  UUID        NOT NULL REFERENCES taxonomy_categories(id) ON DELETE CASCADE,
      code         TEXT        UNIQUE NOT NULL,
      label        TEXT        NOT NULL,
      icon         TEXT,
      display_order INTEGER    NOT NULL DEFAULT 0,
      is_active    BOOLEAN     NOT NULL DEFAULT true,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  // room_search_index
  await sql`
    CREATE TABLE IF NOT EXISTS room_search_index (
      room_id        UUID             PRIMARY KEY,
      property_id    UUID             NOT NULL,
      partner_id     UUID             NOT NULL,
      property_name  TEXT             NOT NULL,
      city           TEXT             NOT NULL,
      country        TEXT             NOT NULL,
      neighborhood   TEXT,
      lat            DOUBLE PRECISION NOT NULL,
      lon            DOUBLE PRECISION NOT NULL,
      room_type      TEXT             NOT NULL,
      bed_type       TEXT             NOT NULL,
      view_type      TEXT             NOT NULL,
      capacity       INTEGER          NOT NULL,
      amenities      TEXT[]           NOT NULL DEFAULT '{}',
      base_price_usd NUMERIC          NOT NULL,
      stars          SMALLINT         NOT NULL,
      rating         NUMERIC          NOT NULL DEFAULT 0,
      review_count   INTEGER          NOT NULL DEFAULT 0,
      thumbnail_url  TEXT             NOT NULL DEFAULT '',
      is_active      BOOLEAN          NOT NULL DEFAULT true,
      last_synced_at TIMESTAMPTZ      NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  // room_availability — composite PK (room_id, from_date)
  await sql`
    CREATE TABLE IF NOT EXISTS room_availability (
      room_id    UUID    NOT NULL,
      from_date  DATE    NOT NULL,
      to_date    DATE    NOT NULL,
      price_usd  NUMERIC NOT NULL,
      PRIMARY KEY (room_id, from_date)
    )
  `.execute(db);

  // ── Indexes on room_search_index ──────────────────────────────────────────

  // Trigram indexes for city and property_name substring/similarity search
  await sql`
    CREATE INDEX IF NOT EXISTS idx_rsi_city_trgm
    ON room_search_index USING GIN (city gin_trgm_ops)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS idx_rsi_property_name_trgm
    ON room_search_index USING GIN (property_name gin_trgm_ops)
  `.execute(db);

  // Btree index for capacity range queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_rsi_capacity
    ON room_search_index (capacity)
  `.execute(db);

  // GIN index for amenities array containment queries (@>)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_rsi_amenities
    ON room_search_index USING GIN (amenities)
  `.execute(db);

  // Btree index for price range filtering and sorting
  await sql`
    CREATE INDEX IF NOT EXISTS idx_rsi_base_price_usd
    ON room_search_index (base_price_usd)
  `.execute(db);

  // Partial index — almost all queries filter is_active = true
  await sql`
    CREATE INDEX IF NOT EXISTS idx_rsi_is_active
    ON room_search_index (is_active)
    WHERE is_active = true
  `.execute(db);

  // GIST index for proximity / bounding-box geo queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_rsi_location
    ON room_search_index USING GIST (point(lon, lat))
  `.execute(db);

  // ── Index on room_availability ────────────────────────────────────────────

  // Composite index used by the availability join in search queries
  await sql`
    CREATE INDEX IF NOT EXISTS idx_ra_room_id_dates
    ON room_availability (room_id, from_date, to_date)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS room_availability`.execute(db);
  await sql`DROP TABLE IF EXISTS room_search_index`.execute(db);
  await sql`DROP TABLE IF EXISTS taxonomy_values`.execute(db);
  await sql`DROP TABLE IF EXISTS taxonomy_categories`.execute(db);
}
