import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "crypto";
import {
  FareCalculatorService,
  FareBreakdown,
} from "../fare/fare-calculator.service.js";
import { InventoryClient } from "../clients/inventory.client.js";
import { PartnersClient } from "../clients/partners.client.js";
import { PaymentClient, RefundOutcome } from "../clients/payment.client.js";
import { ReservationsRepository } from "./reservations.repository.js";
import { HoldsService } from "./holds.service.js";
import { EventsPublisher } from "../events/events.publisher.js";
import {
  BookingActor,
  BookingEvent,
  BookingRoutingKey,
} from "../events/events.types.js";
import {
  CreateReservationDto,
  GuestInfoDto,
  ModifyReservationDto,
  PreviewReservationDto,
} from "./dto/create-reservation.dto.js";
import type { ReservationRow } from "../database/database.types.js";
import { quoteRefund, RefundQuote } from "./refund-policy.js";

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly fareCalculator: FareCalculatorService,
    private readonly reservationsRepo: ReservationsRepository,
    private readonly inventoryClient: InventoryClient,
    private readonly holdsService: HoldsService,
    private readonly publisher: EventsPublisher,
    private readonly partnersClient: PartnersClient,
    private readonly paymentClient: PaymentClient,
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

    this.emit("booking.failed", row, "system");
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

    this.emit("booking.expired", row, "system");
    return this.reservationsRepo.toResponse(row);
  }

  async noShow(id: string, reason = "guest did not arrive") {
    const row = await this.reservationsRepo.markNoShow(id, reason);
    if (!row) return;

    // No inventory.unhold: no-show is billable revenue, the room stays consumed
    // for the stay window (industry standard, matches cancellation-with-penalty).
    this.emit("booking.no_show", row, "system");
    return this.reservationsRepo.toResponse(row);
  }

  async modify(
    id: string,
    dto: ModifyReservationDto,
    actor: BookingActor = "guest",
  ) {
    const current = await this.reservationsRepo.findById(id);

    // Modifications are only safe outside terminal/in-flight states. `submitted`
    // is excluded because the Stripe webhook may flip it to `confirmed`/`failed`
    // mid-update, and `checked_in`/`checked_out` are post-stay.
    const editable = ["held", "confirmed"];
    if (!editable.includes(current.status)) {
      throw new BadRequestException(
        `Cannot modify a reservation with status "${current.status}"`,
      );
    }

    if (actor === "partner" && current.status !== "confirmed") {
      throw new BadRequestException(
        `Partner can only modify confirmed reservations (current: "${current.status}")`,
      );
    }

    const oldCheckIn = String(current.check_in).slice(0, 10);
    const oldCheckOut = String(current.check_out).slice(0, 10);
    const newCheckIn = dto.checkIn ?? oldCheckIn;
    const newCheckOut = dto.checkOut ?? oldCheckOut;

    if (newCheckIn >= newCheckOut) {
      throw new BadRequestException("checkOut must be after checkIn");
    }

    const today = new Date().toISOString().slice(0, 10);
    if (newCheckIn < today) {
      throw new BadRequestException("checkIn cannot be in the past");
    }

    const datesChanged =
      newCheckIn !== oldCheckIn || newCheckOut !== oldCheckOut;

    let fareBreakdown: FareBreakdown | undefined;

    if (datesChanged) {
      // Acquire inventory for the new range first; if this fails (e.g. 409 no
      // availability) we leave the existing reservation intact.
      await this.inventoryClient.hold(current.room_id, newCheckIn, newCheckOut);

      try {
        if (current.status === "confirmed") {
          await this.inventoryClient.release(
            current.room_id,
            oldCheckIn,
            oldCheckOut,
          );
          await this.inventoryClient.confirmHold(
            current.room_id,
            newCheckIn,
            newCheckOut,
          );
        } else {
          // status === "held": swap one hold for another
          await this.inventoryClient.unhold(
            current.room_id,
            oldCheckIn,
            oldCheckOut,
          );
        }
      } catch (err) {
        // Best-effort rollback of the new hold so inventory is not left occupied
        await this.inventoryClient
          .unhold(current.room_id, newCheckIn, newCheckOut)
          .catch((rollbackErr) => {
            this.logger.warn(
              `Failed to roll back new hold for reservation ${id}: ${rollbackErr}`,
            );
          });
        throw err;
      }

      const roomDetails = await this.inventoryClient.getRoomDetails(
        current.room_id,
      );
      fareBreakdown = await this.fareCalculator.calculate({
        propertyId: current.property_id,
        roomId: current.room_id,
        partnerId: current.partner_id,
        checkIn: new Date(newCheckIn),
        checkOut: new Date(newCheckOut),
        propertyLocation: roomDetails,
      });
    }

    const guestInfo = dto.guestInfo
      ? { ...current.guest_info, ...dto.guestInfo }
      : undefined;

    const updated = await this.reservationsRepo.modify(id, {
      checkIn: datesChanged ? newCheckIn : undefined,
      checkOut: datesChanged ? newCheckOut : undefined,
      guestInfo,
      fareBreakdown,
    });

    return this.reservationsRepo.toResponse(updated);
  }

  refundQuote(grandTotalUsd: number, checkIn: string): RefundQuote {
    return quoteRefund(grandTotalUsd, checkIn);
  }

  async getRefundQuote(id: string): Promise<RefundQuote> {
    const row = await this.reservationsRepo.findById(id);
    const total = row.grand_total_usd ? parseFloat(row.grand_total_usd) : 0;
    return this.refundQuote(total, String(row.check_in));
  }

  async cancel(
    id: string,
    reason: string,
    actor: BookingActor = "guest",
    audit: { actorId: string | null; requestIp: string | null } = {
      actorId: null,
      requestIp: null,
    },
  ) {
    if (actor === "partner") {
      const current = await this.reservationsRepo.findById(id);
      if (current.status !== "confirmed") {
        throw new BadRequestException(
          `Cannot partner-cancel a reservation with status "${current.status}"`,
        );
      }
    }

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

    // Automated refund (issue #27). Only `confirmed` reservations have a
    // captured payment to refund — `held`/`submitted`/`failed` either never
    // charged or were already released by the payment retry logic. We treat
    // the refund as best-effort: the cancellation must persist even if the
    // gateway is unreachable, and payment-service is responsible for raising
    // the customer-support alert + writing a failed audit row in that case.
    let refund: RefundOutcome | null = null;
    if (priorStatus === "confirmed") {
      try {
        refund = await this.paymentClient.requestRefund({
          reservationId: id,
          reason,
          actorId: audit.actorId,
          actorRole: actor,
          requestIp: audit.requestIp,
        });
      } catch (err) {
        this.logger.error(
          `Automated refund request failed for reservation ${id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.emit("booking.cancelled", row, actor);
    return { ...this.reservationsRepo.toResponse(row), refund };
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

  async partnerCheckin(id: string, partnerId: string) {
    if (!partnerId) {
      throw new ForbiddenException("Partner identity required");
    }

    const row = await this.reservationsRepo.findById(id);

    if (row.partner_id !== partnerId) {
      throw new ForbiddenException(
        "You are not authorized to check in for this reservation",
      );
    }

    if (row.status !== "confirmed") {
      throw new BadRequestException(
        `Reservation must be confirmed to check in (current status: ${row.status})`,
      );
    }

    const updated = await this.reservationsRepo.checkin(id);
    this.emit("booking.checked_in", updated, "partner");
    return this.reservationsRepo.toResponse(updated);
  }

  async checkin(id: string, checkInKey: string, bookerId: string) {
    const row = await this.reservationsRepo.findById(id);

    if (row.booker_id !== bookerId) {
      throw new ForbiddenException(
        "You are not authorized to check in for this reservation",
      );
    }

    if (row.status !== "confirmed") {
      throw new BadRequestException(
        `Reservation must be confirmed to check in (current status: ${row.status})`,
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const checkIn = String(row.check_in).slice(0, 10);
    const checkOut = String(row.check_out).slice(0, 10);

    if (today < checkIn || today >= checkOut) {
      throw new BadRequestException(
        "Check-in is only allowed between check-in date and check-out date",
      );
    }

    const storedKey = await this.partnersClient.getCheckinKey(
      row.partner_id,
      row.property_id,
    );
    if (!storedKey) {
      throw new NotFoundException(
        "No active check-in key found for this property",
      );
    }

    const storedBuf = Buffer.from(storedKey);
    const providedBuf = Buffer.from(checkInKey);
    if (
      storedBuf.length !== providedBuf.length ||
      !timingSafeEqual(storedBuf, providedBuf)
    ) {
      throw new UnauthorizedException("Invalid check-in key");
    }

    const updated = await this.reservationsRepo.checkin(id);
    this.emit("booking.checked_in", updated, "guest");
    return this.reservationsRepo.toResponse(updated);
  }

  async checkOut(id: string) {
    const row = await this.reservationsRepo.checkOut(id);
    this.emit("booking.checked_out", row, "guest");
    return this.reservationsRepo.toResponse(row);
  }

  async confirm(id: string, actor: BookingActor = "system") {
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

    this.emit("booking.confirmed", row, actor);
    return this.reservationsRepo.toResponse(row);
  }

  private emit(
    routingKey: BookingRoutingKey,
    row: ReservationRow,
    actor: BookingActor,
  ): void {
    const event: BookingEvent = {
      routingKey,
      reservationId: row.id,
      partnerId: row.partner_id,
      propertyId: row.property_id,
      roomId: row.room_id,
      bookerId: row.booker_id,
      guestInfo: row.guest_info ?? null,
      checkIn: String(row.check_in),
      checkOut: String(row.check_out),
      actor,
      timestamp: new Date().toISOString(),
    };
    if (row.reason) event.reason = row.reason;
    this.publisher.publish(routingKey, event);
  }
}
