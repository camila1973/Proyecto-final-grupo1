import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS partner_fees_cache_partner_idx`.execute(db);
  await sql`DROP TABLE IF EXISTS partner_fees_cache`.execute(db);
  await sql`DROP TABLE IF EXISTS tax_rate_cache`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS tax_rate_cache (
      country    TEXT          NOT NULL,
      city       TEXT          NOT NULL DEFAULT '',
      total_pct  NUMERIC(8,4)  NOT NULL,
      updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      PRIMARY KEY (country, city)
    )
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS partner_fees_cache (
      id             UUID          PRIMARY KEY,
      partner_id     UUID          NOT NULL,
      property_id    UUID,
      fee_name       TEXT          NOT NULL DEFAULT '',
      fee_type       TEXT          NOT NULL,
      rate           NUMERIC(8,4),
      flat_amount    NUMERIC(12,2),
      currency       TEXT          NOT NULL DEFAULT 'USD',
      effective_from DATE          NOT NULL,
      effective_to   DATE,
      is_active      BOOLEAN       NOT NULL DEFAULT TRUE
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS partner_fees_cache_partner_idx
      ON partner_fees_cache (partner_id, property_id)
  `.execute(db);
}
