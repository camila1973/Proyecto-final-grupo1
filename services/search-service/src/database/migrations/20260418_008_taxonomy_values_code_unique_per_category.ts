import type { Kysely } from "kysely";
import { sql } from "kysely";

// The global UNIQUE constraint on taxonomy_values.code was too broad —
// the same code (e.g. "pool") can legitimately appear in different categories
// (amenities vs view_type) with different labels. Replace it with a per-category
// unique constraint on (category_id, code).
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE taxonomy_values
      DROP CONSTRAINT IF EXISTS taxonomy_values_code_key,
      ADD CONSTRAINT taxonomy_values_category_code_key UNIQUE (category_id, code)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE taxonomy_values
      DROP CONSTRAINT IF EXISTS taxonomy_values_category_code_key,
      ADD CONSTRAINT taxonomy_values_code_key UNIQUE (code)
  `.execute(db);
}
