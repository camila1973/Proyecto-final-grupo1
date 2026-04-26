import type { Kysely } from "kysely";
import { sql } from "kysely";

// Denormalizes property and room display data into a JSONB snapshot column so
// the reservation record is self-contained. Follows the same pattern as
// fare_breakdown and guest_info: the booking-service owns the authoritative
// copy fetched at reservation time, independent of future inventory changes.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE reservations ADD COLUMN snapshot JSONB
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE reservations DROP COLUMN snapshot
  `.execute(db);
}
