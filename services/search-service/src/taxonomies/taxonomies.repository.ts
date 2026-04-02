import { Inject, Injectable } from "@nestjs/common";
import { Kysely } from "kysely";
import type { Selectable } from "kysely";
import type {
  SearchDatabase,
  TaxonomyCategoryTable,
  TaxonomyValueTable,
} from "../database/database.types.js";
import { KYSELY } from "../database/database.provider.js";

@Injectable()
export class TaxonomiesRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<SearchDatabase>) {}

  async findActiveCategories(): Promise<Selectable<TaxonomyCategoryTable>[]> {
    return this.db
      .selectFrom("taxonomy_categories")
      .selectAll()
      .where("is_active", "=", true)
      .orderBy("display_order", "asc")
      .execute();
  }

  async findActiveValues(): Promise<Selectable<TaxonomyValueTable>[]> {
    return this.db
      .selectFrom("taxonomy_values")
      .selectAll()
      .where("is_active", "=", true)
      .orderBy("display_order", "asc")
      .execute();
  }
}
