import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import {
  FareCalculatorService,
  FareBreakdown,
} from "../fare/fare-calculator.service.js";
import { InventoryClient } from "../clients/inventory.client.js";
import { ReservationsRepository } from "./reservations.repository.js";
import { CacheService } from "../cache/cache.service.js";
import { EventsPublisher } from "../events/events.publisher.js";
import {
  CreateReservationDto,
  PreviewReservationDto,
} from "./dto/create-reservation.dto.js";

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly fareCalculator: FareCalculatorService,
    private readonly reservationsRepo: ReservationsRepository,
    private readonly inventoryClient: InventoryClient,
    private readonly cache: CacheService,
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
    // Atomically consume the hold — GETDEL ensures exactly one reservation per hold
    const idempKey = `booking:hold:idempotency:${dto.bookerId}:${dto.roomId}:${dto.checkIn}:${dto.checkOut}`;
    const holdRaw = await this.cache.getAndDelete(idempKey);

    if (!holdRaw) {
      throw new HttpException("Hold not found or expired", HttpStatus.GONE);
    }

    const holdData = JSON.parse(holdRaw) as {
      holdId: string;
      expiresAt: string;
    };

    if (holdData.holdId !== dto.holdId) {
      throw new UnauthorizedException("holdId mismatch");
    }

    const holdExpiresAt = new Date(holdData.expiresAt);

    const location = await this.inventoryClient.getRoomLocation(dto.roomId);

    const fareBreakdown = await this.fareCalculator.calculate({
      propertyId: dto.propertyId,
      roomId: dto.roomId,
      partnerId: dto.partnerId,
      checkIn: new Date(dto.checkIn),
      checkOut: new Date(dto.checkOut),
      propertyLocation: location,
    });

    const row = await this.reservationsRepo.insert({
      property_id: dto.propertyId,
      room_id: dto.roomId,
      partner_id: dto.partnerId,
      booker_id: dto.bookerId,
      guest_info: dto.guestInfo,
      check_in: dto.checkIn,
      check_out: dto.checkOut,
      status: "pending",
      fare_breakdown: fareBreakdown,
      tax_total_usd: fareBreakdown.taxTotalUsd,
      fee_total_usd: fareBreakdown.feeTotalUsd,
      grand_total_usd: fareBreakdown.totalUsd,
      hold_expires_at: holdExpiresAt,
    });

    return {
      ...this.reservationsRepo.toResponse(row),
      fareBreakdown,
      holdExpiresAt: holdExpiresAt.toISOString(),
    };
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
