import { Injectable } from "@nestjs/common";
import {
  FareCalculatorService,
  FareBreakdown,
} from "../fare/fare-calculator.service.js";
import { RoomLocationCacheService } from "../room-location-cache/room-location-cache.service.js";
import { ReservationsRepository } from "./reservations.repository.js";
import { EventsPublisher } from "../events/events.publisher.js";
import {
  CreateReservationDto,
  PreviewReservationDto,
} from "./dto/create-reservation.dto.js";

@Injectable()
export class ReservationsService {
  constructor(
    private readonly fareCalculator: FareCalculatorService,
    private readonly reservationsRepo: ReservationsRepository,
    private readonly roomLocationCache: RoomLocationCacheService,
    private readonly publisher: EventsPublisher,
  ) {}

  async preview(dto: PreviewReservationDto): Promise<FareBreakdown> {
    const location = await this.roomLocationCache.findByRoomId(dto.roomId);
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
    const location = await this.roomLocationCache.findByRoomId(dto.roomId);

    const fareBreakdown = await this.fareCalculator.calculate({
      propertyId: dto.propertyId,
      roomId: dto.roomId,
      partnerId: dto.partnerId,
      checkIn: new Date(dto.checkIn),
      checkOut: new Date(dto.checkOut),
      propertyLocation: location,
    });

    const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const row = await this.reservationsRepo.insert({
      property_id: dto.propertyId,
      room_id: dto.roomId,
      partner_id: dto.partnerId,
      guest_id: dto.guestId,
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

  async findAll(guestId?: string) {
    const rows = guestId
      ? await this.reservationsRepo.findByGuestId(guestId)
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
    this.publisher.publish("booking.confirmed", {
      routingKey: "booking.confirmed",
      reservationId: row.id,
      partnerId: row.partner_id,
      propertyId: row.property_id,
      roomId: row.room_id,
      guestId: row.guest_id,
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
