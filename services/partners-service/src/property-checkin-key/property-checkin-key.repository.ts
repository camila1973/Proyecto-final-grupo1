import { Inject, Injectable } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider.js";
import { Database } from "../database/database.types.js";

export interface CheckinKeyRow {
  checkInKey: string;
  createdAt: Date;
}

@Injectable()
export class PropertyCheckinKeyRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findActiveKey(
    partnerId: string,
    propertyId: string,
  ): Promise<CheckinKeyRow | null> {
    const row = await this.db
      .selectFrom("propertyCheckInKeys")
      .select(["checkInKey", "createdAt"])
      .where("partnerId", "=", partnerId)
      .where("propertyId", "=", propertyId)
      .where("enabled", "=", true)
      .executeTakeFirst();
    return row ?? null;
  }

  async rotateKey(
    partnerId: string,
    propertyId: string,
    newKey: string,
  ): Promise<CheckinKeyRow | null> {
    const row = await this.db
      .updateTable("propertyCheckInKeys")
      .set({ checkInKey: newKey, createdAt: new Date() })
      .where("partnerId", "=", partnerId)
      .where("propertyId", "=", propertyId)
      .where("enabled", "=", true)
      .returning(["checkInKey", "createdAt"])
      .executeTakeFirst();
    return row ?? null;
  }
}
