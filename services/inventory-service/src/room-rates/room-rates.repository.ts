import { Inject, Injectable } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider";
import { Database, NewRoomRate, RoomRateRow } from "../database/database.types";

@Injectable()
export class RoomRatesRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByRoom(
    roomId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<RoomRateRow[]> {
    let query = this.db
      .selectFrom("inv_room_rates")
      .selectAll()
      .where("room_id", "=", roomId)
      .orderBy("from_date", "asc");
    if (fromDate) query = query.where("to_date", ">", fromDate);
    if (toDate) query = query.where("from_date", "<", toDate);
    return query.execute();
  }

  async findOverlapping(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<RoomRateRow[]> {
    return this.db
      .selectFrom("inv_room_rates")
      .selectAll()
      .where("room_id", "=", roomId)
      .where("from_date", "<", toDate)
      .where("to_date", ">", fromDate)
      .execute();
  }

  async findById(id: string): Promise<RoomRateRow | undefined> {
    return this.db
      .selectFrom("inv_room_rates")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
  }

  async create(data: NewRoomRate): Promise<RoomRateRow> {
    return this.db
      .insertInto("inv_room_rates")
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom("inv_room_rates").where("id", "=", id).execute();
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db.deleteFrom("inv_room_rates").where("id", "in", ids).execute();
  }
}
