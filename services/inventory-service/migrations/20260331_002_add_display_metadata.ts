import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("inv_properties")
    .addColumn("neighborhood", "text")
    .execute();

  await db.schema
    .alterTable("inv_properties")
    .addColumn("lat", "double precision")
    .execute();

  await db.schema
    .alterTable("inv_properties")
    .addColumn("lon", "double precision")
    .execute();

  await db.schema
    .alterTable("inv_properties")
    .addColumn("rating", sql`numeric(3,2)`, (col) => col.notNull().defaultTo(0))
    .execute();

  await db.schema
    .alterTable("inv_properties")
    .addColumn("review_count", "integer", (col) => col.notNull().defaultTo(0))
    .execute();

  await db.schema
    .alterTable("inv_properties")
    .addColumn("thumbnail_url", "text", (col) => col.notNull().defaultTo(""))
    .execute();

  await db.schema
    .alterTable("inv_properties")
    .addColumn("amenities", sql`text[]`, (col) =>
      col.notNull().defaultTo(sql`'{}'::text[]`),
    )
    .execute();

  await db.schema
    .alterTable("inv_rooms")
    .addColumn("bed_type", "text", (col) => col.notNull().defaultTo(""))
    .execute();

  await db.schema
    .alterTable("inv_rooms")
    .addColumn("view_type", "text", (col) => col.notNull().defaultTo(""))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("inv_properties")
    .dropColumn("amenities")
    .execute();
  await db.schema
    .alterTable("inv_properties")
    .dropColumn("thumbnail_url")
    .execute();
  await db.schema
    .alterTable("inv_properties")
    .dropColumn("review_count")
    .execute();
  await db.schema.alterTable("inv_properties").dropColumn("rating").execute();
  await db.schema.alterTable("inv_properties").dropColumn("lon").execute();
  await db.schema.alterTable("inv_properties").dropColumn("lat").execute();
  await db.schema
    .alterTable("inv_properties")
    .dropColumn("neighborhood")
    .execute();

  await db.schema.alterTable("inv_rooms").dropColumn("view_type").execute();
  await db.schema.alterTable("inv_rooms").dropColumn("bed_type").execute();
}
