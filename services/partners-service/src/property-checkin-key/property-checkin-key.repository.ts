import { Inject, Injectable } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider.js";
import { Database } from "../database/database.types.js";

@Injectable()
export class PropertyCheckinKeyRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findActiveKey(
    partnerId: string,
    propertyId: string,
  ): Promise<string | null> {
    const row = await this.db
      .selectFrom("propertyCheckInKeys")
      .select("checkInKey")
      .where("partnerId", "=", partnerId)
      .where("propertyId", "=", propertyId)
      .where("enabled", "=", true)
      .executeTakeFirst();
    return row?.checkInKey ?? null;
  }

  async rotateKey(
    partnerId: string,
    propertyId: string,
    newKey: string,
  ): Promise<string | null> {
    const row = await this.db
      .updateTable("propertyCheckInKeys")
      .set({ checkInKey: newKey })
      .where("partnerId", "=", partnerId)
      .where("propertyId", "=", propertyId)
      .where("enabled", "=", true)
      .returning("checkInKey")
      .executeTakeFirst();
    return row?.checkInKey ?? null;
  }
}
