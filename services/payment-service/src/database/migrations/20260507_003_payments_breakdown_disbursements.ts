import type { Kysely } from "kysely";
import { sql } from "kysely";

// Audit-correct payment breakdown + disbursements model.
// MVP migration — no production data, schema is added with NOT NULL where
// possible. Snapshot fields on `payments` are populated at initiate time so
// every payment row carries the full audit trail.
export async function up(db: Kysely<any>): Promise<void> {
  // ── payments: snapshot columns ────────────────────────────────────────────
  await sql`
    ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS partner_id              UUID,
      ADD COLUMN IF NOT EXISTS property_id             UUID,
      ADD COLUMN IF NOT EXISTS property_name           TEXT,
      ADD COLUMN IF NOT EXISTS gross_amount_usd        NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS tax_amount_usd          NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS partner_fee_usd         NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS commission_rate         NUMERIC(8,4),
      ADD COLUMN IF NOT EXISTS commission_amount_usd   NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS net_payout_usd          NUMERIC(12,2),
      ADD COLUMN IF NOT EXISTS fare_snapshot           JSONB,
      ADD COLUMN IF NOT EXISTS captured_at             TIMESTAMPTZ
  `.execute(db);

  await sql`
    ALTER TABLE payments
      ADD CONSTRAINT payments_currency_usd_chk CHECK (currency IN ('usd', 'USD'))
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS payments_partner_captured_idx
      ON payments (partner_id, captured_at)
      WHERE status = 'captured'
  `.execute(db);

  // ── commission_rules ──────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS commission_rules (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id     UUID,
      rate           NUMERIC(8,4) NOT NULL,
      effective_from DATE NOT NULL,
      effective_to   DATE,
      is_active      BOOLEAN NOT NULL DEFAULT TRUE,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS commission_rules_partner_idx
      ON commission_rules (partner_id, effective_from)
  `.execute(db);

  // Default global rule: 20% commission, effective forever.
  await sql`
    INSERT INTO commission_rules (partner_id, rate, effective_from)
    VALUES (NULL, 0.20, '2020-01-01')
    ON CONFLICT DO NOTHING
  `.execute(db);

  // ── disbursements ─────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS disbursements (
      id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      partner_id               UUID NOT NULL,
      period_start             DATE NOT NULL,
      period_end               DATE NOT NULL,
      scheduled_for            DATE NOT NULL,
      currency                 TEXT NOT NULL DEFAULT 'USD',
      gross_total_usd          NUMERIC(14,2) NOT NULL DEFAULT 0,
      tax_total_usd            NUMERIC(14,2) NOT NULL DEFAULT 0,
      partner_fee_total_usd    NUMERIC(14,2) NOT NULL DEFAULT 0,
      commission_total_usd     NUMERIC(14,2) NOT NULL DEFAULT 0,
      net_total_usd            NUMERIC(14,2) NOT NULL DEFAULT 0,
      status                   TEXT NOT NULL DEFAULT 'pending',
      paid_at                  TIMESTAMPTZ,
      failure_reason           TEXT,
      external_transfer_ref    TEXT,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT disbursements_currency_usd_chk CHECK (currency = 'USD'),
      CONSTRAINT disbursements_unique_period UNIQUE (partner_id, period_start, period_end)
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS disbursements_partner_idx
      ON disbursements (partner_id, period_start)
  `.execute(db);

  // ── disbursement_items ────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS disbursement_items (
      disbursement_id          UUID NOT NULL REFERENCES disbursements(id) ON DELETE CASCADE,
      payment_id               UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
      property_id              UUID NOT NULL,
      property_name            TEXT NOT NULL,
      gross_amount_usd         NUMERIC(12,2) NOT NULL,
      tax_amount_usd           NUMERIC(12,2) NOT NULL,
      partner_fee_usd          NUMERIC(12,2) NOT NULL,
      commission_amount_usd    NUMERIC(12,2) NOT NULL,
      net_payout_usd           NUMERIC(12,2) NOT NULL,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (disbursement_id, payment_id)
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS disbursement_items_property_idx
      ON disbursement_items (disbursement_id, property_id)
  `.execute(db);

  // ── payment_adjustments (refund stub) ─────────────────────────────────────
  // Schema-ready for refunds/disputes. Aggregator joins by applied_at into the
  // disbursement period; wiring of Stripe refund webhooks is a follow-up.
  await sql`
    CREATE TABLE IF NOT EXISTS payment_adjustments (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_id   UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
      kind         TEXT NOT NULL,
      amount_usd   NUMERIC(12,2) NOT NULL,
      applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      external_ref TEXT,
      reason       TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT payment_adjustments_kind_chk CHECK (kind IN ('refund', 'dispute', 'manual'))
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS payment_adjustments_payment_idx
      ON payment_adjustments (payment_id)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS payment_adjustments_applied_idx
      ON payment_adjustments (applied_at)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS payment_adjustments`.execute(db);
  await sql`DROP TABLE IF EXISTS disbursement_items`.execute(db);
  await sql`DROP TABLE IF EXISTS disbursements`.execute(db);
  await sql`DROP TABLE IF EXISTS commission_rules`.execute(db);

  await sql`DROP INDEX IF EXISTS payments_partner_captured_idx`.execute(db);
  await sql`ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_currency_usd_chk`.execute(
    db,
  );
  await sql`
    ALTER TABLE payments
      DROP COLUMN IF EXISTS captured_at,
      DROP COLUMN IF EXISTS fare_snapshot,
      DROP COLUMN IF EXISTS net_payout_usd,
      DROP COLUMN IF EXISTS commission_amount_usd,
      DROP COLUMN IF EXISTS commission_rate,
      DROP COLUMN IF EXISTS partner_fee_usd,
      DROP COLUMN IF EXISTS tax_amount_usd,
      DROP COLUMN IF EXISTS gross_amount_usd,
      DROP COLUMN IF EXISTS property_name,
      DROP COLUMN IF EXISTS property_id,
      DROP COLUMN IF EXISTS partner_id
  `.execute(db);
}
