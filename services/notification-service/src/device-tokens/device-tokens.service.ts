import { Inject, Injectable, Logger } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider.js";
import type { Database } from "../database/database.types.js";

@Injectable()
export class DeviceTokensService {
  private readonly logger = new Logger(DeviceTokensService.name);

  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async upsert(
    userId: string,
    token: string,
    platform: "ios" | "android",
  ): Promise<void> {
    await this.db
      .insertInto("device_tokens")
      .values({ user_id: userId, token, platform })
      .onConflict((oc) =>
        oc.columns(["user_id", "token"]).doUpdateSet({
          platform,
          updated_at: new Date(),
        }),
      )
      .execute();
    this.logger.debug(`Upserted device token for userId=${userId}`);
  }

  async findByUserId(userId: string): Promise<string | null> {
    const row = await this.db
      .selectFrom("device_tokens")
      .select("token")
      .where("user_id", "=", userId)
      .orderBy("updated_at", "desc")
      .limit(1)
      .executeTakeFirst();
    return row?.token ?? null;
  }

  async remove(userId: string, token: string): Promise<void> {
    await this.db
      .deleteFrom("device_tokens")
      .where("user_id", "=", userId)
      .where("token", "=", token)
      .execute();
    this.logger.debug(`Removed device token for userId=${userId}`);
  }
}
