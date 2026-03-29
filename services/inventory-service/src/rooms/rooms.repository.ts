import { Inject, Injectable } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider";
import {
  Database,
  NewRoom,
  RoomRow,
  RoomUpdate,
} from "../database/database.types";

@Injectable()
export class RoomsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async create(data: NewRoom): Promise<RoomRow> {
    return this.db
      .insertInto("inv_rooms")
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findByProperty(propertyId: string): Promise<RoomRow[]> {
    return this.db
      .selectFrom("inv_rooms")
      .selectAll()
      .where("property_id", "=", propertyId)
      .where("status", "=", "active")
      .execute();
  }

  async findById(id: string): Promise<RoomRow | undefined> {
    return this.db
      .selectFrom("inv_rooms")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
  }

  async findByPropertyAndType(
    propertyId: string,
    roomType: string,
  ): Promise<RoomRow | undefined> {
    return this.db
      .selectFrom("inv_rooms")
      .selectAll()
      .where("property_id", "=", propertyId)
      .where("room_type", "=", roomType)
      .where("status", "=", "active")
      .executeTakeFirst();
  }

  async update(id: string, data: RoomUpdate): Promise<RoomRow | undefined> {
    return this.db
      .updateTable("inv_rooms")
      .set({ ...data, updated_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .updateTable("inv_rooms")
      .set({ status: "inactive", updated_at: new Date() })
      .where("id", "=", id)
      .execute();
  }
}
