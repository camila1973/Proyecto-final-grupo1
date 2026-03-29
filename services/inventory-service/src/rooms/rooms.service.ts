import { Injectable, NotFoundException } from "@nestjs/common";
import { RoomsRepository } from "./rooms.repository";
import { CreateRoomDto, PublicRoom, UpdateRoomDto } from "./rooms.types";
import { PropertiesService } from "../properties/properties.service";
import { PropertiesRepository } from "../properties/properties.repository";
import { EventsPublisher } from "../events/events.publisher";
import { RoomSnapshot } from "../events/events.types";
import { RoomRow } from "../database/database.types";

@Injectable()
export class RoomsService {
  constructor(
    private readonly repo: RoomsRepository,
    private readonly propertiesService: PropertiesService,
    private readonly propertiesRepo: PropertiesRepository,
    private readonly events: EventsPublisher,
  ) {}

  async create(
    propertyId: string,
    partnerId: string,
    dto: CreateRoomDto,
  ): Promise<PublicRoom> {
    await this.propertiesService.findOne(propertyId, partnerId);
    const room = await this.repo.create({
      property_id: propertyId,
      room_type: dto.roomType,
      capacity: dto.capacity,
      total_rooms: dto.totalRooms,
      base_price_usd: String(dto.basePriceUsd),
    });
    await this.publishRoomUpdated(room);
    return this.toPublic(room);
  }

  async findByProperty(
    propertyId: string,
    partnerId: string,
  ): Promise<PublicRoom[]> {
    await this.propertiesService.findOne(propertyId, partnerId);
    const rows = await this.repo.findByProperty(propertyId);
    return rows.map((r) => this.toPublic(r));
  }

  async findOne(id: string, partnerId: string): Promise<PublicRoom> {
    const room = await this.repo.findById(id);
    if (!room) throw new NotFoundException(`Room ${id} not found`);
    await this.propertiesService.findOne(room.property_id, partnerId);
    return this.toPublic(room);
  }

  async findOneRaw(id: string): Promise<RoomRow | undefined> {
    return this.repo.findById(id);
  }

  async update(
    id: string,
    partnerId: string,
    dto: UpdateRoomDto,
  ): Promise<PublicRoom> {
    await this.findOne(id, partnerId);
    const updated = await this.repo.update(id, {
      room_type: dto.roomType,
      capacity: dto.capacity,
      total_rooms: dto.totalRooms,
      status: dto.status,
      base_price_usd:
        dto.basePriceUsd !== undefined ? String(dto.basePriceUsd) : undefined,
    });
    if (!updated) throw new NotFoundException(`Room ${id} not found`);
    await this.publishRoomUpdated(updated);
    return this.toPublic(updated);
  }

  async remove(id: string, partnerId: string): Promise<void> {
    const room = await this.findOne(id, partnerId);
    await this.repo.softDelete(id);
    this.events.publish("inventory.room.deleted", {
      routingKey: "inventory.room.deleted",
      roomId: id,
      propertyId: room.propertyId,
      timestamp: new Date().toISOString(),
    });
  }

  private async publishRoomUpdated(room: RoomRow): Promise<void> {
    const property = await this.propertiesRepo.findById(room.property_id);
    if (!property) return;
    const snapshot: RoomSnapshot = {
      roomId: room.id,
      propertyId: property.id,
      propertyName: property.name,
      city: property.city,
      countryCode: property.country_code,
      roomType: room.room_type,
      capacity: room.capacity,
      totalRooms: room.total_rooms,
      basePriceUsd: parseFloat(room.base_price_usd),
      stars: property.stars,
    };
    this.events.publish("inventory.room.updated", {
      routingKey: "inventory.room.updated",
      timestamp: new Date().toISOString(),
      snapshot,
    });
  }

  private toPublic(row: RoomRow): PublicRoom {
    return {
      id: row.id,
      propertyId: row.property_id,
      roomType: row.room_type,
      capacity: row.capacity,
      totalRooms: row.total_rooms,
      basePriceUsd: row.base_price_usd,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
