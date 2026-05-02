import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider.js";
import {
  Database,
  NewPartnerMember,
  PartnerMemberRow,
} from "../database/database.types.js";

@Injectable()
export class MembersRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByPartnerId(partnerId: string): Promise<PartnerMemberRow[]> {
    return this.db
      .selectFrom("partnerMembers")
      .selectAll()
      .where("partnerId", "=", partnerId)
      .orderBy("createdAt", "asc")
      .execute();
  }

  async findByPropertyId(propertyId: string): Promise<PartnerMemberRow[]> {
    return this.db
      .selectFrom("partnerMembers")
      .selectAll()
      .where("propertyId", "=", propertyId)
      .execute();
  }

  async findByUserId(userId: string): Promise<PartnerMemberRow | null> {
    return (
      (await this.db
        .selectFrom("partnerMembers")
        .selectAll()
        .where("userId", "=", userId)
        .executeTakeFirst()) ?? null
    );
  }

  async insert(values: NewPartnerMember): Promise<PartnerMemberRow> {
    return this.db
      .insertInto("partnerMembers")
      .values(values)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async delete(id: string): Promise<void> {
    const result = await this.db
      .deleteFrom("partnerMembers")
      .where("id", "=", id)
      .executeTakeFirst();
    if (!result.numDeletedRows) {
      throw new NotFoundException(`Member ${id} not found`);
    }
  }
}
