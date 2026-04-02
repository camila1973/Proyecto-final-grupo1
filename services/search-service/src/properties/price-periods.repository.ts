import { Inject, Injectable } from "@nestjs/common";
import { Kysely, sql } from "kysely";
import type { SearchDatabase } from "../database/database.types.js";
import { KYSELY } from "../database/database.provider.js";

export interface PricePeriod {
  from_date: string;
  to_date: string;
  price_usd: number;
}

@Injectable()
export class PricePeriodsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<SearchDatabase>) {}

  async replaceForRoom(roomId: string, periods: PricePeriod[]): Promise<void> {
    await sql`
      DELETE FROM room_price_periods WHERE room_id = ${roomId}::uuid
    `.execute(this.db);

    for (const period of periods) {
      await sql`
        INSERT INTO room_price_periods (room_id, from_date, to_date, price_usd)
        VALUES (
          ${roomId}::uuid,
          ${period.from_date}::date,
          ${period.to_date}::date,
          ${period.price_usd}
        )
      `.execute(this.db);
    }
  }
}
