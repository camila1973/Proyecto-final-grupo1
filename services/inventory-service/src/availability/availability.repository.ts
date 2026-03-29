import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { Kysely, sql } from "kysely";
import { KYSELY } from "../database/database.provider";
import { Database } from "../database/database.types";
import {
  AvailabilityDayDto,
  BulkAvailabilityResult,
} from "./availability.types";

@Injectable()
export class AvailabilityRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async getAvailability(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<AvailabilityDayDto[]> {
    const result = await sql<{
      date: string;
      total_rooms: number;
      reserved_rooms: number;
      held_rooms: number;
      blocked: boolean;
      available: boolean;
    }>`
      SELECT
        d::date                                                                AS date,
        COALESCE(a.total_rooms, r.total_rooms)                                 AS total_rooms,
        COALESCE(a.reserved_rooms, 0)                                          AS reserved_rooms,
        COALESCE(a.held_rooms, 0)                                              AS held_rooms,
        COALESCE(a.blocked, false)                                             AS blocked,
        NOT COALESCE(a.blocked, false)
          AND COALESCE(a.total_rooms, r.total_rooms)
              - COALESCE(a.reserved_rooms, 0)
              - COALESCE(a.held_rooms, 0) > 0                                  AS available
      FROM generate_series(${fromDate}::date, ${toDate}::date - 1, '1 day') d
      JOIN inv_rooms r ON r.id = ${roomId}::uuid
      LEFT JOIN inv_availability a ON a.room_id = ${roomId}::uuid AND a.date = d::date
    `.execute(this.db);

    return result.rows.map((r) => ({
      date: r.date,
      totalRooms: r.total_rooms,
      reservedRooms: r.reserved_rooms,
      heldRooms: r.held_rooms,
      blocked: r.blocked,
      available: r.available,
    }));
  }

  async bulkCheck(
    roomIds: string[],
    fromDate: string,
    toDate: string,
  ): Promise<BulkAvailabilityResult[]> {
    if (roomIds.length === 0) return [];
    const result = await sql<{ room_id: string; available: boolean }>`
      SELECT
        r.id AS room_id,
        NOT EXISTS (
          SELECT 1
          FROM generate_series(${fromDate}::date, ${toDate}::date - 1, '1 day') d
          LEFT JOIN inv_availability a ON a.room_id = r.id AND a.date = d::date
          WHERE COALESCE(a.blocked, false)
             OR COALESCE(a.total_rooms, r.total_rooms)
                - COALESCE(a.reserved_rooms, 0)
                - COALESCE(a.held_rooms, 0) <= 0
        ) AS available
      FROM inv_rooms r
      WHERE r.id = ANY(${sql.raw(`ARRAY[${roomIds.map((_, i) => `$${i + 4}`).join(",")}]::uuid[]`)}
      ${sql.raw("")})
    `.execute(this.db);
    return result.rows.map((r) => ({
      roomId: r.room_id,
      available: r.available,
    }));
  }

  async reduceCapacity(
    roomId: string,
    fromDate: string,
    toDate: string,
    totalRooms: number,
  ): Promise<void> {
    for (const date of this.eachDay(fromDate, toDate)) {
      await this.db
        .insertInto("inv_availability")
        .values({
          room_id: roomId,
          date: new Date(date),
          total_rooms: totalRooms,
        })
        .onConflict((oc) =>
          oc
            .columns(["room_id", "date"])
            .doUpdateSet({ total_rooms: totalRooms }),
        )
        .execute();
    }
  }

  async blockDates(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    for (const date of this.eachDay(fromDate, toDate)) {
      await this.db
        .insertInto("inv_availability")
        .values({ room_id: roomId, date: new Date(date), blocked: true })
        .onConflict((oc) =>
          oc.columns(["room_id", "date"]).doUpdateSet({ blocked: true }),
        )
        .execute();
    }
  }

  async unblockDates(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    for (const date of this.eachDay(fromDate, toDate)) {
      await this.db
        .updateTable("inv_availability")
        .set({ blocked: false })
        .where("room_id", "=", roomId)
        .where("date", "=", date)
        .execute();
    }
    await this.cleanupSparse(roomId);
  }

  async hold(roomId: string, fromDate: string, toDate: string): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      for (const date of this.eachDay(fromDate, toDate)) {
        const result = await sql<{ remaining: number; blocked: boolean }>`
          WITH upserted AS (
            INSERT INTO inv_availability (room_id, date, held_rooms)
            VALUES (${roomId}::uuid, ${date}::date, 1)
            ON CONFLICT (room_id, date) DO UPDATE
              SET held_rooms = inv_availability.held_rooms + 1
            RETURNING room_id, total_rooms, reserved_rooms, held_rooms, blocked
          )
          SELECT
            COALESCE(u.total_rooms, r.total_rooms)
              - u.reserved_rooms - u.held_rooms AS remaining,
            u.blocked
          FROM upserted u
          JOIN inv_rooms r ON r.id = u.room_id
        `.execute(trx);

        const row = result.rows[0];
        if (!row || row.remaining < 0 || row.blocked) {
          throw new ConflictException(
            `No available capacity for room ${roomId} on ${date}`,
          );
        }
      }
    });
  }

  async unhold(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      for (const date of this.eachDay(fromDate, toDate)) {
        await sql`
          UPDATE inv_availability
          SET held_rooms = GREATEST(0, held_rooms - 1)
          WHERE room_id = ${roomId}::uuid AND date = ${date}::date
        `.execute(trx);
      }
    });
    await this.cleanupSparse(roomId);
  }

  async confirm(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      for (const date of this.eachDay(fromDate, toDate)) {
        await sql`
          UPDATE inv_availability
          SET held_rooms     = GREATEST(0, held_rooms - 1),
              reserved_rooms = reserved_rooms + 1
          WHERE room_id = ${roomId}::uuid AND date = ${date}::date
        `.execute(trx);
      }
    });
  }

  async release(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      for (const date of this.eachDay(fromDate, toDate)) {
        await sql`
          UPDATE inv_availability
          SET reserved_rooms = GREATEST(0, reserved_rooms - 1)
          WHERE room_id = ${roomId}::uuid AND date = ${date}::date
        `.execute(trx);
      }
    });
    await this.cleanupSparse(roomId);
  }

  private async cleanupSparse(roomId: string): Promise<void> {
    await this.db
      .deleteFrom("inv_availability")
      .where("room_id", "=", roomId)
      .where("total_rooms", "is", null)
      .where("reserved_rooms", "=", 0)
      .where("held_rooms", "=", 0)
      .where("blocked", "=", false)
      .execute();
  }

  private eachDay(fromDate: string, toDate: string): string[] {
    const days: string[] = [];
    const current = new Date(fromDate);
    const end = new Date(toDate);
    while (current < end) {
      days.push(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return days;
  }
}
