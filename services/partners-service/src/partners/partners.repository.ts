import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider.js";
import {
  Database,
  NewPartner,
  PartnerRow,
} from "../database/database.types.js";

@Injectable()
export class PartnersRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findAll(): Promise<PartnerRow[]> {
    return this.db.selectFrom("partners").selectAll().orderBy("name").execute();
  }

  async findById(id: string): Promise<PartnerRow> {
    const row = await this.db
      .selectFrom("partners")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!row) throw new NotFoundException(`Partner ${id} not found`);
    return row;
  }

  async findBySlug(slug: string): Promise<PartnerRow | null> {
    return (
      (await this.db
        .selectFrom("partners")
        .selectAll()
        .where("slug", "=", slug)
        .executeTakeFirst()) ?? null
    );
  }

  async insert(values: NewPartner): Promise<PartnerRow> {
    return this.db
      .insertInto("partners")
      .values(values)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, values: Partial<NewPartner>): Promise<PartnerRow> {
    const row = await this.db
      .updateTable("partners")
      .set({ ...values, updatedAt: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    if (!row) throw new NotFoundException(`Partner ${id} not found`);
    return row;
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom("partners").where("id", "=", id).execute();
  }
}
