import { Injectable, Logger } from "@nestjs/common";
import { sql } from "kysely";
import { DatabaseService } from "../../database/database.service.js";
import { PropertiesService } from "../../properties/properties.service.js";

export interface PricePeriod {
  from_date: string;
  to_date: string;
  price_usd: number;
}

export interface AvailabilityUpdatedPayload {
  room_id: string;
  /** Seasonal price periods to replace for this room. */
  price_periods: PricePeriod[];
}

@Injectable()
export class AvailabilityUpdatedHandler {
  private readonly logger = new Logger(AvailabilityUpdatedHandler.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly properties: PropertiesService,
  ) {}

  async handle(payload: AvailabilityUpdatedPayload): Promise<void> {
    // Replace all price periods for this room atomically.
    await sql`
      DELETE FROM room_price_periods WHERE room_id = ${payload.room_id}::uuid
    `.execute(this.db.db);

    for (const period of payload.price_periods) {
      await sql`
        INSERT INTO room_price_periods (room_id, from_date, to_date, price_usd)
        VALUES (
          ${payload.room_id}::uuid,
          ${period.from_date}::date,
          ${period.to_date}::date,
          ${period.price_usd}
        )
      `.execute(this.db.db);
    }

    const row = await this.db.db
      .selectFrom("room_search_index")
      .select("city")
      .where("room_id", "=", payload.room_id)
      .executeTakeFirst();

    if (row) {
      await this.properties.invalidateCityCache(row.city);
    }

    this.logger.debug(
      `Updated price periods for room ${payload.room_id} (${payload.price_periods.length} periods)`,
    );
  }
}
