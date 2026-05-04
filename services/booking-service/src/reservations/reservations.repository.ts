import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider.js";
import {
  Database,
  GuestInfo,
  NewReservation,
  ReservationRow,
  ReservationSnapshot,
} from "../database/database.types.js";

export interface ReservationResponse {
  id: string;
  propertyId: string;
  roomId: string;
  bookerId: string;
  guestInfo: GuestInfo;
  checkIn: string;
  checkOut: string;
  status: string;
  reason: string | null;
  fareBreakdown: unknown;
  taxTotalUsd: number | null;
  feeTotalUsd: number | null;
  grandTotalUsd: number | null;
  holdExpiresAt: string | null;
  checkedInAt: string | null;
  snapshot: ReservationSnapshot | null;
  createdAt: string;
}

@Injectable()
export class ReservationsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async insert(values: NewReservation): Promise<ReservationRow> {
    return this.db
      .insertInto("reservations")
      .values(values)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findAll(): Promise<ReservationRow[]> {
    return this.db.selectFrom("reservations").selectAll().execute();
  }

  async findByBookerId(bookerId: string): Promise<ReservationRow[]> {
    return this.db
      .selectFrom("reservations")
      .where("booker_id", "=", bookerId)
      .selectAll()
      .execute();
  }

  async findById(id: string): Promise<ReservationRow> {
    const row = await this.db
      .selectFrom("reservations")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }

    return row;
  }

  async submit(id: string): Promise<ReservationRow> {
    const row = await this.db
      .updateTable("reservations")
      .set({ status: "submitted", updated_at: new Date() })
      .where("id", "=", id)
      .where("status", "=", "held")
      .returningAll()
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException(`Reservation ${id} not found or not held`);
    }

    return row;
  }

  async confirm(id: string): Promise<ReservationRow> {
    const row = await this.db
      .updateTable("reservations")
      .set({ status: "confirmed", updated_at: new Date() })
      .where("id", "=", id)
      .where("status", "=", "submitted")
      .returningAll()
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }

    return row;
  }

  async fail(id: string, reason: string): Promise<ReservationRow> {
    const row = await this.db
      .updateTable("reservations")
      .set({ status: "failed", reason, updated_at: new Date() })
      .where("id", "=", id)
      .where("status", "=", "submitted")
      .returningAll()
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException(
        `Reservation ${id} not found or not submitted`,
      );
    }

    return row;
  }

  async cancel(
    id: string,
    reason: string,
  ): Promise<{ row: ReservationRow; priorStatus: string }> {
    return this.db.transaction().execute(async (trx) => {
      // Lock the row so concurrent state transitions (e.g. payment webhook)
      // cannot change status between our read and our update.
      const current = await trx
        .selectFrom("reservations")
        .where("id", "=", id)
        .select("status")
        .forUpdate()
        .executeTakeFirst();

      if (!current) {
        throw new NotFoundException(`Reservation ${id} not found`);
      }

      if (current.status === "expired" || current.status === "cancelled") {
        throw new NotFoundException(
          `Reservation ${id} is already terminal (${current.status})`,
        );
      }

      const row = await trx
        .updateTable("reservations")
        .set({ status: "cancelled", reason, updated_at: new Date() })
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return { row, priorStatus: current.status };
    });
  }

  async findExpiredHolds(): Promise<ReservationRow[]> {
    return this.db
      .selectFrom("reservations")
      .where("status", "=", "held")
      .where("hold_expires_at", "<", new Date())
      .selectAll()
      .execute();
  }

  async findHeldByBookerId(bookerId: string): Promise<ReservationRow | null> {
    const row = await this.db
      .selectFrom("reservations")
      .where("booker_id", "=", bookerId)
      .where("status", "=", "held")
      .selectAll()
      .executeTakeFirst();

    return row ?? null;
  }

  async findHoldByBookerAndStay(
    bookerId: string,
    roomId: string,
    checkIn: string,
    checkOut: string,
  ): Promise<ReservationRow | null> {
    const row = await this.db
      .selectFrom("reservations")
      .where("booker_id", "=", bookerId)
      .where("room_id", "=", roomId)
      .where("check_in", "=", checkIn)
      .where("check_out", "=", checkOut)
      .where("status", "=", "held")
      .selectAll()
      .executeTakeFirst();

    return row ?? null;
  }

  async updateGuestInfo(
    id: string,
    guestInfo: GuestInfo,
  ): Promise<ReservationRow> {
    const row = await this.db
      .updateTable("reservations")
      .set({ guest_info: guestInfo, updated_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }

    return row;
  }

  async rehold(id: string, holdExpiresAt: Date): Promise<ReservationRow> {
    const row = await this.db
      .updateTable("reservations")
      .set({
        status: "held",
        hold_expires_at: holdExpiresAt,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .where("status", "=", "failed")
      .returningAll()
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException(`Reservation ${id} not found or not failed`);
    }

    return row;
  }

  async expire(
    id: string,
    reason: string,
  ): Promise<ReservationRow | undefined> {
    return this.db
      .updateTable("reservations")
      .set({ status: "expired", reason, updated_at: new Date() })
      .where("id", "=", id)
      .where("status", "=", "held")
      .returningAll()
      .executeTakeFirst();
  }

  async checkin(id: string): Promise<ReservationRow> {
    const row = await this.db
      .updateTable("reservations")
      .set({
        status: "checked_in",
        checked_in_at: new Date(),
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .where("status", "=", "confirmed")
      .returningAll()
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException(
        `Reservation ${id} not found or not confirmed`,
      );
    }

    return row;
  }

  toResponse(row: ReservationRow): ReservationResponse {
    return {
      id: row.id,
      propertyId: row.property_id,
      roomId: row.room_id,
      bookerId: row.booker_id,
      guestInfo: row.guest_info,
      checkIn: row.check_in,
      checkOut: row.check_out,
      status: row.status,
      reason: row.reason ?? null,
      fareBreakdown: row.fare_breakdown,
      taxTotalUsd: row.tax_total_usd ? parseFloat(row.tax_total_usd) : null,
      feeTotalUsd: row.fee_total_usd ? parseFloat(row.fee_total_usd) : null,
      grandTotalUsd: row.grand_total_usd
        ? parseFloat(row.grand_total_usd)
        : null,
      holdExpiresAt: row.hold_expires_at
        ? row.hold_expires_at instanceof Date
          ? row.hold_expires_at.toISOString()
          : String(row.hold_expires_at)
        : null,
      checkedInAt: row.checked_in_at
        ? row.checked_in_at instanceof Date
          ? row.checked_in_at.toISOString()
          : String(row.checked_in_at)
        : null,
      snapshot: row.snapshot ?? null,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    };
  }
}
