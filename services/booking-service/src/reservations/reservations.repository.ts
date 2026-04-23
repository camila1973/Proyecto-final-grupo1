import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider.js";
import {
  Database,
  GuestInfo,
  NewReservation,
  ReservationRow,
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
  fareBreakdown: unknown;
  taxTotalUsd: number | null;
  feeTotalUsd: number | null;
  grandTotalUsd: number | null;
  holdExpiresAt: string | null;
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

  async confirm(id: string): Promise<ReservationRow> {
    const row = await this.db
      .updateTable("reservations")
      .set({ status: "confirmed", updated_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException(`Reservation ${id} not found`);
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
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    };
  }
}
