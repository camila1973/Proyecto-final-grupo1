import type { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("room_location_cache").ifExists().execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("room_location_cache")
    .ifNotExists()
    .addColumn("room_id", "uuid", (col) => col.primaryKey().notNull())
    .addColumn("property_id", "uuid", (col) => col.notNull())
    .addColumn("country", "text", (col) => col.notNull())
    .addColumn("city", "text", (col) => col.notNull())
    .addColumn("synced_at", "timestamptz", (col) =>
      col.notNull().defaultTo(db.fn.now()),
    )
    .execute();
}
