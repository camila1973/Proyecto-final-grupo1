import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE SEQUENCE IF NOT EXISTS partner_identifier_seq START 1`.execute(
    db,
  );
  await sql`
    ALTER TABLE partners
      ADD COLUMN identifier TEXT NOT NULL UNIQUE
        DEFAULT ('PAR-' || LPAD(nextval('partner_identifier_seq')::text, 4, '0'))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE partners DROP COLUMN identifier`.execute(db);
  await sql`DROP SEQUENCE IF EXISTS partner_identifier_seq`.execute(db);
}
