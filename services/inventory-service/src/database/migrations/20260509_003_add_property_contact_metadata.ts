import { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("inv_properties")
    .addColumn("phone", "text")
    .execute();

  await db.schema
    .alterTable("inv_properties")
    .addColumn("email", "text")
    .execute();

  await db.schema
    .alterTable("inv_properties")
    .addColumn("address", "text")
    .execute();

  await db.schema
    .alterTable("inv_properties")
    .addColumn("currency", "text")
    .execute();

  await db.schema
    .alterTable("inv_properties")
    .addColumn("timezone", "text")
    .execute();

  await db.schema
    .alterTable("inv_properties")
    .addColumn("description", "text")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("inv_properties")
    .dropColumn("description")
    .execute();
  await db.schema.alterTable("inv_properties").dropColumn("timezone").execute();
  await db.schema.alterTable("inv_properties").dropColumn("currency").execute();
  await db.schema.alterTable("inv_properties").dropColumn("address").execute();
  await db.schema.alterTable("inv_properties").dropColumn("email").execute();
  await db.schema.alterTable("inv_properties").dropColumn("phone").execute();
}
