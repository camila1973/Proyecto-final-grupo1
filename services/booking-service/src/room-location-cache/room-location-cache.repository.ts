import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider.js";
import { Database } from "../database/database.types.js";

export interface RoomLocation {
  country: string;
  city: string;
}

@Injectable()
export class RoomLocationCacheRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async upsert(
    roomId: string,
    propertyId: string,
    location: RoomLocation,
  ): Promise<void> {
    await this.db
      .insertInto("room_location_cache")
      .values({
        room_id: roomId,
        property_id: propertyId,
        country: location.country,
        city: location.city.toLowerCase(),
      })
      .onConflict((oc) =>
        oc.column("room_id").doUpdateSet({
          property_id: propertyId,
          country: location.country,
          city: location.city.toLowerCase(),
          synced_at: new Date(),
        }),
      )
      .execute();
  }

  async findByRoomId(roomId: string): Promise<RoomLocation> {
    const row = await this.db
      .selectFrom("room_location_cache")
      .where("room_id", "=", roomId)
      .select(["country", "city"])
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException(
        `No location data for room ${roomId}. ` +
          `Ensure inventory.room.upserted events have been received.`,
      );
    }

    return { country: row.country, city: row.city };
  }
}
