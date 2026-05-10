import type { Kysely } from "kysely";
import { sql } from "kysely";

// Audit columns for automated refunds (issue #27).
//
// Every refund — successful or failed — produces a payment_adjustments row.
// The actor and IP must be persisted alongside the Stripe refund id so support
// can answer "who triggered this and from where" without joining other systems.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE payment_adjustments
      ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'succeeded',
      ADD COLUMN IF NOT EXISTS failure_reason TEXT,
      ADD COLUMN IF NOT EXISTS actor_id       TEXT,
      ADD COLUMN IF NOT EXISTS actor_role     TEXT,
      ADD COLUMN IF NOT EXISTS request_ip     TEXT
  `.execute(db);

  await sql`
    ALTER TABLE payment_adjustments
      ADD CONSTRAINT payment_adjustments_status_chk
      CHECK (status IN ('succeeded', 'failed'))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE payment_adjustments
      DROP CONSTRAINT IF EXISTS payment_adjustments_status_chk
  `.execute(db);
  await sql`
    ALTER TABLE payment_adjustments
      DROP COLUMN IF EXISTS request_ip,
      DROP COLUMN IF EXISTS actor_role,
      DROP COLUMN IF EXISTS actor_id,
      DROP COLUMN IF EXISTS failure_reason,
      DROP COLUMN IF EXISTS status
  `.execute(db);
}
