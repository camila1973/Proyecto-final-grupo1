import { Injectable, Logger } from "@nestjs/common";
import { sql } from "kysely";
import { DatabaseService } from "../../database/database.service.js";
import { PropertiesService } from "../../properties/properties.service.js";

export interface AvailabilityUpdatedPayload {
  room_id: string;
  ranges: Array<{
    from_date: string;
    to_date: string;
    price_usd: number;
  }>;
}

@Injectable()
export class AvailabilityUpdatedHandler {
  private readonly logger = new Logger(AvailabilityUpdatedHandler.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly properties: PropertiesService,
  ) {}

  async handle(payload: AvailabilityUpdatedPayload): Promise<void> {
    await sql`
      DELETE FROM room_availability WHERE room_id = ${payload.room_id}::uuid
    `.execute(this.db.db);

    for (const range of payload.ranges) {
      await sql`
        INSERT INTO room_availability (room_id, from_date, to_date, price_usd)
        VALUES (
          ${payload.room_id}::uuid,
          ${range.from_date}::date,
          ${range.to_date}::date,
          ${range.price_usd}
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
      `Updated availability for room ${payload.room_id} (${payload.ranges.length} ranges)`,
    );
  }
}
