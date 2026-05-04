import { Injectable, Logger } from "@nestjs/common";
import {
  FareCalculatorService,
  FareBreakdown,
} from "../fare/fare-calculator.service.js";
import { InventoryClient } from "../clients/inventory.client.js";
import { ReservationsRepository } from "./reservations.repository.js";
import { HoldsService } from "./holds.service.js";
import { EventsPublisher } from "../events/events.publisher.js";
import {
  CreateReservationDto,
  GuestInfoDto,
  PreviewReservationDto,
} from "./dto/create-reservation.dto.js";

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly fareCalculator: FareCalculatorService,
    private readonly reservationsRepo: ReservationsRepository,
    private readonly inventoryClient: InventoryClient,
    private readonly holdsService: HoldsService,
    private readonly publisher: EventsPublisher,
  ) {}

  async preview(dto: PreviewReservationDto): Promise<FareBreakdown> {
    const location = await this.inventoryClient.getRoomLocation(dto.roomId);
    return this.fareCalculator.calculate({
      propertyId: dto.propertyId,
      roomId: dto.roomId,
      partnerId: dto.partnerId,
      checkIn: new Date(dto.checkIn),
      checkOut: new Date(dto.checkOut),
      propertyLocation: location,
    });
  }

  async create(dto: CreateReservationDto) {
    // Idempotency guard — return existing held reservation if one already exists
    const existing = await this.reservationsRepo.findHoldByBookerAndStay(
      dto.bookerId,
      dto.roomId,
      dto.checkIn,
      dto.checkOut,
    );
    if (existing) {
      const fareBreakdown = existing.fare_breakdown as unknown as FareBreakdown;
      return {
        created: false as const,
        ...this.reservationsRepo.toResponse(existing),
        fareBreakdown,
        holdExpiresAt: existing.hold_expires_at
          ? existing.hold_expires_at instanceof Date
            ? existing.hold_expires_at.toISOString()
            : String(existing.hold_expires_at)
          : null,
      };
    }

    // Expire any stale hold the booker has on a different room/dates
    const staleHold = await this.reservationsRepo.findHeldByBookerId(
      dto.bookerId,
    );
    if (staleHold) {
      await this.expire(staleHold.id, "superseded by new hold").catch((err) => {
        this.logger.warn(
          `Failed to expire stale hold ${staleHold.id} for booker ${dto.bookerId}: ${err}`,
        );
      });
    }

    // Create inventory hold — locks room and starts 15-min clock
    const { holdId, expiresAt } = await this.holdsService.create({
      bookerId: dto.bookerId,
      roomId: dto.roomId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
    });

    const holdExpiresAt = new Date(expiresAt);

    let fareBreakdown: FareBreakdown;
    let snapshot: import("../database/database.types.js").ReservationSnapshot;
    try {
      const [roomDetails, propertyInfo] = await Promise.all([
        this.inventoryClient.getRoomDetails(dto.roomId),
        this.inventoryClient.getPropertySnapshot(dto.propertyId),
      ]);
      fareBreakdown = await this.fareCalculator.calculate({
        propertyId: dto.propertyId,
        roomId: dto.roomId,
        partnerId: dto.partnerId,
        checkIn: new Date(dto.checkIn),
        checkOut: new Date(dto.checkOut),
        propertyLocation: roomDetails,
      });
      snapshot = {
        propertyName: propertyInfo.name,
        propertyCity: propertyInfo.city,
        propertyNeighborhood: propertyInfo.neighborhood,
        propertyCountryCode: propertyInfo.countryCode,
        propertyThumbnailUrl: propertyInfo.thumbnailUrl,
        roomType: roomDetails.roomType,
      };
    } catch (err) {
      // Release the hold if we can't compute the fare or fetch snapshot
      this.logger.error(
        `Reservation setup failed for room ${dto.roomId}: ${err}`,
      );
      await this.holdsService.release(holdId).catch((releaseErr) => {
        this.logger.warn(
          `Failed to release hold ${holdId} after setup error: ${releaseErr}`,
        );
      });
      throw err;
    }

    let row: Awaited<ReturnType<typeof this.reservationsRepo.insert>>;
    try {
      row = await this.reservationsRepo.insert({
        property_id: dto.propertyId,
        room_id: dto.roomId,
        partner_id: dto.partnerId,
        booker_id: dto.bookerId,
        check_in: dto.checkIn,
        check_out: dto.checkOut,
        status: "held",
        fare_breakdown: fareBreakdown,
        tax_total_usd: fareBreakdown.taxTotalUsd,
        fee_total_usd: fareBreakdown.feeTotalUsd,
        grand_total_usd: fareBreakdown.totalUsd,
        hold_expires_at: holdExpiresAt,
        snapshot,
      });
    } catch (err: any) {
      // Unique constraint violation — a concurrent request already inserted the row.
      // Re-query and return the existing pending reservation idempotently.
      if (err?.code === "23505") {
        await this.holdsService.release(holdId).catch(() => undefined);
        const existing = await this.reservationsRepo.findHoldByBookerAndStay(
          dto.bookerId,
          dto.roomId,
          dto.checkIn,
          dto.checkOut,
        );
        if (existing) {
          return {
            created: false as const,
            ...this.reservationsRepo.toResponse(existing),
            fareBreakdown: existing.fare_breakdown as unknown as FareBreakdown,
            holdExpiresAt: existing.hold_expires_at
              ? existing.hold_expires_at instanceof Date
                ? existing.hold_expires_at.toISOString()
                : String(existing.hold_expires_at)
              : null,
          };
        }
      }
      await this.holdsService.release(holdId).catch((releaseErr) => {
        this.logger.warn(
          `Failed to release hold ${holdId} after insert error: ${releaseErr}`,
        );
      });
      throw err;
    }

    return {
      created: true as const,
      ...this.reservationsRepo.toResponse(row),
      fareBreakdown,
      holdExpiresAt: holdExpiresAt.toISOString(),
    };
  }

  async updateGuestInfo(id: string, dto: GuestInfoDto) {
    const row = await this.reservationsRepo.updateGuestInfo(id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
    });
    return this.reservationsRepo.toResponse(row);
  }

  async findAll(bookerId?: string) {
    const rows = bookerId
      ? await this.reservationsRepo.findByBookerId(bookerId)
      : await this.reservationsRepo.findAll();
    return {
      total: rows.length,
      reservations: rows.map((r) => this.reservationsRepo.toResponse(r)),
    };
  }

  async findOne(id: string) {
    const row = await this.reservationsRepo.findById(id);
    return this.reservationsRepo.toResponse(row);
  }

  async submit(id: string) {
    const row = await this.reservationsRepo.submit(id);
    return this.reservationsRepo.toResponse(row);
  }

  async fail(id: string, reason: string) {
    const row = await this.reservationsRepo.fail(id, reason);

    try {
      await this.inventoryClient.unhold(
        row.room_id,
        row.check_in,
        row.check_out,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to unhold inventory for failed reservation ${id}: ${err}`,
      );
    }

    return this.reservationsRepo.toResponse(row);
  }

  async expire(id: string, reason: string) {
    const row = await this.reservationsRepo.expire(id, reason);
    if (!row) return;

    try {
      await this.inventoryClient.unhold(
        row.room_id,
        row.check_in,
        row.check_out,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to unhold inventory for expired reservation ${id}: ${err}`,
      );
    }

    return this.reservationsRepo.toResponse(row);
  }

  async cancel(id: string, reason: string) {
    const { row, priorStatus } = await this.reservationsRepo.cancel(id, reason);

    try {
      if (priorStatus === "confirmed") {
        await this.inventoryClient.release(
          row.room_id,
          row.check_in,
          row.check_out,
        );
      } else if (priorStatus === "held" || priorStatus === "submitted") {
        await this.inventoryClient.unhold(
          row.room_id,
          row.check_in,
          row.check_out,
        );
      }
      // failed: already unheld by fail() — no-op
    } catch (err) {
      this.logger.warn(
        `Failed to update inventory for cancelled reservation ${id}: ${err}`,
      );
    }

    return this.reservationsRepo.toResponse(row);
  }

  async rehold(id: string) {
    const row = await this.reservationsRepo.findById(id);

    const { holdId, expiresAt } = await this.holdsService.create({
      bookerId: row.booker_id,
      roomId: row.room_id,
      checkIn: row.check_in,
      checkOut: row.check_out,
    });

    const updated = await this.reservationsRepo
      .rehold(id, new Date(expiresAt))
      .catch(async (err) => {
        await this.holdsService.release(holdId).catch((releaseErr) => {
          this.logger.warn(
            `Failed to release hold ${holdId} after rehold error: ${releaseErr}`,
          );
        });
        throw err;
      });

    return this.reservationsRepo.toResponse(updated);
  }

  async confirm(id: string) {
    const row = await this.reservationsRepo.confirm(id);

    try {
      await this.inventoryClient.confirmHold(
        row.room_id,
        row.check_in,
        row.check_out,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to confirm hold in inventory for reservation ${id}: ${err}`,
      );
    }

    this.publisher.publish("booking.confirmed", {
      routingKey: "booking.confirmed",
      reservationId: row.id,
      partnerId: row.partner_id,
      propertyId: row.property_id,
      roomId: row.room_id,
      bookerId: row.booker_id,
      guestInfo: row.guest_info,
      checkIn: row.check_in,
      checkOut: row.check_out,
      fareBreakdown: row.fare_breakdown,
      grandTotalUsd: row.grand_total_usd ? parseFloat(row.grand_total_usd) : 0,
      taxTotalUsd: row.tax_total_usd ? parseFloat(row.tax_total_usd) : 0,
      feeTotalUsd: row.fee_total_usd ? parseFloat(row.fee_total_usd) : 0,
      timestamp: new Date().toISOString(),
    });
    return this.reservationsRepo.toResponse(row);
  }
}
