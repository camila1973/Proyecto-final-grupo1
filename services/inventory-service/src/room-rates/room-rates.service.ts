import { Injectable, NotFoundException } from "@nestjs/common";
import { RoomRatesRepository } from "./room-rates.repository";
import { CreateRoomRateDto, PublicRoomRate } from "./room-rates.types";
import { RoomsService } from "../rooms/rooms.service";
import { EventsPublisher } from "../events/events.publisher";
import { RoomRateRow } from "../database/database.types";

function toDateString(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class RoomRatesService {
  constructor(
    private readonly repo: RoomRatesRepository,
    private readonly roomsService: RoomsService,
    private readonly events: EventsPublisher,
  ) {}

  async findByRoom(
    roomId: string,
    partnerId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<PublicRoomRate[]> {
    await this.roomsService.findOne(roomId);
    const rows = await this.repo.findByRoom(roomId, fromDate, toDate);
    return rows.map((r) => this.toPublic(r));
  }

  async create(
    roomId: string,
    partnerId: string,
    dto: CreateRoomRateDto,
  ): Promise<PublicRoomRate> {
    await this.roomsService.findOne(roomId);
    await this.splitOnOverlap(roomId, dto.fromDate, dto.toDate);
    const rate = await this.repo.create({
      room_id: roomId,
      from_date: new Date(dto.fromDate),
      to_date: new Date(dto.toDate),
      price_usd: String(dto.priceUsd),
      currency: dto.currency ?? "USD",
    });
    this.events.publish("inventory.price.updated", {
      routingKey: "inventory.price.updated",
      roomId,
      pricePeriods: [
        { fromDate: dto.fromDate, toDate: dto.toDate, priceUsd: dto.priceUsd },
      ],
      timestamp: new Date().toISOString(),
    });
    return this.toPublic(rate);
  }

  async findByProperty(
    propertyId: string,
    partnerId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<PublicRoomRate[]> {
    const rooms = await this.roomsService.findByProperty(propertyId);
    const results = await Promise.all(
      rooms.map((r) => this.repo.findByRoom(r.id, fromDate, toDate)),
    );
    return results.flat().map((r) => this.toPublic(r));
  }

  async replace(
    rateId: string,
    partnerId: string,
    dto: CreateRoomRateDto,
  ): Promise<PublicRoomRate> {
    const existing = await this.repo.findById(rateId);
    if (!existing) throw new NotFoundException(`Rate ${rateId} not found`);
    await this.roomsService.findOne(existing.room_id);
    await this.repo.delete(rateId);
    return this.create(existing.room_id, partnerId, dto);
  }

  async remove(rateId: string): Promise<void> {
    const rate = await this.repo.findById(rateId);
    if (!rate) throw new NotFoundException(`Rate ${rateId} not found`);
    await this.roomsService.findOne(rate.room_id);
    await this.repo.delete(rateId);
  }

  /**
   * Split-range: trims or splits overlapping rates before inserting the new range.
   * A date can only have one price; the new range wins over any existing overlap.
   */
  private async splitOnOverlap(
    roomId: string,
    fromDate: string,
    toDate: string,
  ): Promise<void> {
    const overlapping = await this.repo.findOverlapping(
      roomId,
      fromDate,
      toDate,
    );
    if (overlapping.length === 0) return;

    const toDelete: string[] = [];
    const toCreate: Array<{
      from_date: string;
      to_date: string;
      price_usd: string;
      currency: string;
    }> = [];

    for (const existing of overlapping) {
      toDelete.push(existing.id);

      const existingFrom = toDateString(existing.from_date);
      const existingTo = toDateString(existing.to_date);

      if (existingFrom < fromDate) {
        toCreate.push({
          from_date: existingFrom,
          to_date: fromDate,
          price_usd: String(existing.price_usd),
          currency: existing.currency,
        });
      }
      if (existingTo > toDate) {
        toCreate.push({
          from_date: toDate,
          to_date: existingTo,
          price_usd: String(existing.price_usd),
          currency: existing.currency,
        });
      }
    }

    await this.repo.deleteMany(toDelete);
    for (const segment of toCreate) {
      await this.repo.create({ room_id: roomId, ...segment });
    }
  }

  private toPublic(row: RoomRateRow): PublicRoomRate {
    return {
      id: row.id,
      roomId: row.room_id,
      fromDate: row.from_date,
      toDate: row.to_date,
      priceUsd: row.price_usd,
      currency: row.currency,
      createdAt: row.created_at,
    };
  }
}
