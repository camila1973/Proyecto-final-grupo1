import type { Kysely } from "kysely";
import { sql } from "kysely";

// Allow multiple payment attempts per reservation (e.g. retry after card decline).
// The unique index on stripe_payment_intent_id remains — each attempt still maps
// to exactly one Stripe intent.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_reservation_id_key
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE payments ADD CONSTRAINT payments_reservation_id_key UNIQUE (reservation_id)
  `.execute(db);
}
