import { Inject, Injectable } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider";
import {
  Database,
  NewProperty,
  PropertyRow,
  PropertyUpdate,
  RoomRow,
} from "../database/database.types";

export interface PropertyWithRooms {
  property: PropertyRow;
  rooms: RoomRow[];
}

@Injectable()
export class PropertiesRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async create(data: NewProperty): Promise<PropertyRow> {
    return this.db
      .insertInto("inv_properties")
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findAll(
    partnerId: string,
    filters: { city?: string; status?: string },
  ): Promise<PropertyRow[]> {
    let query = this.db
      .selectFrom("inv_properties")
      .selectAll()
      .where("partner_id", "=", partnerId);
    if (filters.city) query = query.where("city", "=", filters.city);
    if (filters.status) query = query.where("status", "=", filters.status);
    return query.execute();
  }

  async findById(id: string): Promise<PropertyRow | undefined> {
    return this.db
      .selectFrom("inv_properties")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
  }

  async findByIdWithRooms(id: string): Promise<PropertyWithRooms | undefined> {
    const property = await this.findById(id);
    if (!property) return undefined;
    const rooms = await this.db
      .selectFrom("inv_rooms")
      .selectAll()
      .where("property_id", "=", id)
      .where("status", "=", "active")
      .execute();
    return { property, rooms };
  }

  async findByName(name: string): Promise<PropertyRow | undefined> {
    return this.db
      .selectFrom("inv_properties")
      .selectAll()
      .where("name", "=", name)
      .executeTakeFirst();
  }

  async update(
    id: string,
    data: PropertyUpdate,
  ): Promise<PropertyRow | undefined> {
    return this.db
      .updateTable("inv_properties")
      .set({ ...data, updated_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .updateTable("inv_properties")
      .set({ status: "inactive", updated_at: new Date() })
      .where("id", "=", id)
      .execute();
  }
}
