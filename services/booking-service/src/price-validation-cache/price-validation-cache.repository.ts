import { Injectable, Inject } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider.js";
import { Database } from "../database/database.types.js";

export interface PricePeriod {
  fromDate: string;
  toDate: string;
  priceUsd: number;
}

@Injectable()
export class PriceValidationCacheRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async replaceForRoom(roomId: string, periods: PricePeriod[]): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      await trx
        .deleteFrom("price_validation_cache")
        .where("room_id", "=", roomId)
        .execute();

      if (periods.length > 0) {
        await trx
          .insertInto("price_validation_cache")
          .values(
            periods.map((p) => ({
              room_id: roomId,
              from_date: p.fromDate,
              to_date: p.toDate,
              price_usd: String(p.priceUsd),
            })),
          )
          .execute();
      }
    });
  }

  async findCoveringStay(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<{ price_usd: string } | undefined> {
    const checkInStr = checkIn.toISOString().slice(0, 10);
    const checkOutStr = checkOut.toISOString().slice(0, 10);

    return this.db
      .selectFrom("price_validation_cache")
      .where("room_id", "=", roomId)
      .where("from_date", "<=", checkInStr)
      .where("to_date", ">=", checkOutStr)
      .select("price_usd")
      .executeTakeFirst();
  }
}
