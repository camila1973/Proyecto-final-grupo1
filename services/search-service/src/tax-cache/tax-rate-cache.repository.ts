import { Injectable, Inject } from "@nestjs/common";
import { Kysely, sql } from "kysely";
import type { SearchDatabase } from "../database/database.types.js";
import { KYSELY } from "../database/database.provider.js";

@Injectable()
export class TaxRateCacheRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<SearchDatabase>) {}

  async lookup(country: string, city: string): Promise<number> {
    // Try city-specific first, fall back to country-level (city='')
    const row = await this.db
      .selectFrom("tax_rate_cache")
      .select("total_pct")
      .where("country", "=", country)
      .where("city", "=", city.toLowerCase())
      .executeTakeFirst();
    if (row) return parseFloat(row.total_pct);

    const countryRow = await this.db
      .selectFrom("tax_rate_cache")
      .select("total_pct")
      .where("country", "=", country)
      .where("city", "=", "")
      .executeTakeFirst();
    return countryRow ? parseFloat(countryRow.total_pct) : 0;
  }

  async upsert(country: string, city: string, totalPct: number): Promise<void> {
    await sql`
      INSERT INTO tax_rate_cache (country, city, total_pct, updated_at)
      VALUES (${country}, ${city.toLowerCase()}, ${totalPct}, NOW())
      ON CONFLICT (country, city) DO UPDATE SET
        total_pct  = EXCLUDED.total_pct,
        updated_at = NOW()
    `.execute(this.db);
  }

  async delete(country: string, city: string): Promise<void> {
    await this.db
      .deleteFrom("tax_rate_cache")
      .where("country", "=", country)
      .where("city", "=", city.toLowerCase())
      .execute();
  }

  async bulkUpdateRoomSearchIndex(
    country: string,
    city: string,
    taxRatePct: number,
  ): Promise<void> {
    await this.db
      .updateTable("room_search_index")
      .set({ tax_rate_pct: String(taxRatePct) })
      .where("country", "=", country)
      .where(sql<boolean>`LOWER(city) = ${city.toLowerCase()}`)
      .execute();
  }
}
