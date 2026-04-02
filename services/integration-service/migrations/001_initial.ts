import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS pms_registrations (
      id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id     TEXT        NOT NULL,
      name           TEXT        NOT NULL,
      adapter_type   TEXT        NOT NULL CHECK (adapter_type IN ('generic', 'hotelbeds', 'travelclick', 'roomraccoon')),
      signing_secret TEXT        NOT NULL,
      enabled        BOOLEAN     NOT NULL DEFAULT true,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS external_id_map (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id  TEXT        NOT NULL,
      entity_type TEXT        NOT NULL CHECK (entity_type IN ('property', 'room', 'booking', 'hold')),
      external_id TEXT        NOT NULL,
      internal_id TEXT        NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (partner_id, entity_type, external_id)
    )
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS processed_events (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id   TEXT        NOT NULL,
      event_id     TEXT        NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (partner_id, event_id)
    )
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS import_jobs (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id    TEXT        NOT NULL,
      type          TEXT        NOT NULL CHECK (type IN ('properties', 'rooms')),
      status        TEXT        NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
      row_count     INTEGER     NOT NULL DEFAULT 0,
      success_count INTEGER     NOT NULL DEFAULT 0,
      failure_count INTEGER     NOT NULL DEFAULT 0,
      errors        JSONB       NOT NULL DEFAULT '[]',
      file_path     TEXT        NOT NULL DEFAULT '',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at  TIMESTAMPTZ
    )
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS import_jobs`.execute(db);
  await sql`DROP TABLE IF EXISTS processed_events`.execute(db);
  await sql`DROP TABLE IF EXISTS external_id_map`.execute(db);
  await sql`DROP TABLE IF EXISTS pms_registrations`.execute(db);
}
