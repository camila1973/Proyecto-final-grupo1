import type { Kysely } from "kysely";
import { sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE reservations RENAME COLUMN guest_id TO booker_id`.execute(
    db,
  );

  await db.schema
    .alterTable("reservations")
    .addColumn("guest_info", "jsonb", (col) =>
      col.notNull().defaultTo(sql`'{}'::jsonb`),
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("reservations").dropColumn("guest_info").execute();

  await sql`ALTER TABLE reservations RENAME COLUMN booker_id TO guest_id`.execute(
    db,
  );
}
