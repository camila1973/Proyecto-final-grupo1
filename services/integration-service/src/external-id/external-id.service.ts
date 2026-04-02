import { Inject, Injectable } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider";
import { Database } from "../database/database.types";

export type EntityType = "property" | "room" | "booking" | "hold";

@Injectable()
export class ExternalIdService {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async resolve(
    partnerId: string,
    entityType: EntityType,
    externalId: string,
  ): Promise<string | null> {
    const row = await this.db
      .selectFrom("externalIdMap")
      .select("internalId")
      .where("partnerId", "=", partnerId)
      .where("entityType", "=", entityType)
      .where("externalId", "=", externalId)
      .executeTakeFirst();
    return row?.internalId ?? null;
  }

  async register(
    partnerId: string,
    entityType: EntityType,
    externalId: string,
    internalId: string,
  ): Promise<void> {
    await this.db
      .insertInto("externalIdMap")
      .values({ partnerId, entityType, externalId, internalId })
      .onConflict((oc) =>
        oc.columns(["partnerId", "entityType", "externalId"]).doNothing(),
      )
      .execute();
  }
}
