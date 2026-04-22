import type { Kysely } from "kysely";
import { sql } from "kysely";

// Use Kysely<any> — migrations are frozen in time and must not depend on
// application types that can change between versions.
export async function up(db: Kysely<any>): Promise<void> {
  // ── tax_rules ─────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS tax_rules (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      country        TEXT NOT NULL,
      city           TEXT,
      tax_name       TEXT NOT NULL,
      tax_type       TEXT NOT NULL,
      rate           NUMERIC(8,4),
      flat_amount    NUMERIC(12,2),
      currency       TEXT NOT NULL DEFAULT 'USD',
      applies_to     TEXT NOT NULL DEFAULT 'ROOM_RATE',
      effective_from DATE NOT NULL,
      effective_to   DATE,
      is_active      BOOLEAN NOT NULL DEFAULT TRUE,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS tax_rules_location_idx ON tax_rules (country, city)
  `.execute(db);

  // ── partner_fees ──────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS partner_fees (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id     UUID NOT NULL,
      property_id    UUID,
      fee_name       TEXT NOT NULL,
      fee_type       TEXT NOT NULL,
      rate           NUMERIC(8,4),
      flat_amount    NUMERIC(12,2),
      currency       TEXT NOT NULL DEFAULT 'USD',
      effective_from DATE NOT NULL,
      effective_to   DATE,
      is_active      BOOLEAN NOT NULL DEFAULT TRUE,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS partner_fees_partner_idx ON partner_fees (partner_id, property_id)
  `.execute(db);

  // ── room_location_cache ───────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS room_location_cache (
      room_id     UUID NOT NULL PRIMARY KEY,
      property_id UUID NOT NULL,
      country     TEXT NOT NULL,
      city        TEXT NOT NULL,
      synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  // ── reservations ──────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS reservations (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id     UUID NOT NULL,
      room_id         UUID NOT NULL,
      partner_id      UUID NOT NULL,
      guest_id        UUID NOT NULL,
      check_in        DATE NOT NULL,
      check_out       DATE NOT NULL,
      status          TEXT NOT NULL DEFAULT 'pending',
      fare_breakdown  JSONB,
      tax_total_usd   NUMERIC(12,2),
      fee_total_usd   NUMERIC(12,2),
      grand_total_usd NUMERIC(12,2),
      hold_expires_at TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS reservations`.execute(db);
  await sql`DROP TABLE IF EXISTS room_location_cache`.execute(db);
  await sql`DROP TABLE IF EXISTS partner_fees`.execute(db);
  await sql`DROP TABLE IF EXISTS tax_rules`.execute(db);
}
