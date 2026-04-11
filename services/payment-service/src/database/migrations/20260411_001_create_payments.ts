import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reservation_id            UUID NOT NULL UNIQUE,
      stripe_payment_intent_id  TEXT NOT NULL UNIQUE,
      stripe_payment_method_id  TEXT,
      amount_usd                NUMERIC(12,2) NOT NULL,
      currency                  TEXT NOT NULL DEFAULT 'usd',
      status                    TEXT NOT NULL DEFAULT 'pending',
      failure_reason            TEXT,
      guest_email               TEXT NOT NULL,
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS payments_reservation_idx ON payments (reservation_id)
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS payments_intent_idx ON payments (stripe_payment_intent_id)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS payments`.execute(db);
}
