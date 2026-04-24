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
    // Idempotency guard — return existing pending reservation if one already exists
    const existing = await this.reservationsRepo.findPendingByBookerAndStay(
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

    // Create inventory hold — locks room and starts 15-min clock
    const { holdId, expiresAt } = await this.holdsService.create({
      bookerId: dto.bookerId,
      roomId: dto.roomId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
    });

    const holdExpiresAt = new Date(expiresAt);

    let fareBreakdown: FareBreakdown;
    try {
      const location = await this.inventoryClient.getRoomLocation(dto.roomId);
      fareBreakdown = await this.fareCalculator.calculate({
        propertyId: dto.propertyId,
        roomId: dto.roomId,
        partnerId: dto.partnerId,
        checkIn: new Date(dto.checkIn),
        checkOut: new Date(dto.checkOut),
        propertyLocation: location,
      });
    } catch (err) {
      // Release the hold if we can't compute the fare
      this.logger.error(
        `Fare calculation failed for room ${dto.roomId}: ${err}`,
      );
      await this.holdsService.release(holdId).catch((releaseErr) => {
        this.logger.warn(
          `Failed to release hold ${holdId} after fare error: ${releaseErr}`,
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
        status: "on_hold",
        fare_breakdown: fareBreakdown,
        tax_total_usd: fareBreakdown.taxTotalUsd,
        fee_total_usd: fareBreakdown.feeTotalUsd,
        grand_total_usd: fareBreakdown.totalUsd,
        hold_expires_at: holdExpiresAt,
      });
    } catch (err: any) {
      // Unique constraint violation — a concurrent request already inserted the row.
      // Re-query and return the existing pending reservation idempotently.
      if (err?.code === "23505") {
        await this.holdsService.release(holdId).catch(() => undefined);
        const existing = await this.reservationsRepo.findPendingByBookerAndStay(
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

  async submitPayment(id: string) {
    const row = await this.reservationsRepo.submitPayment(id);
    return this.reservationsRepo.toResponse(row);
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
