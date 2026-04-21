import { Injectable, NotFoundException } from "@nestjs/common";
import { RoomsRepository } from "./rooms.repository";
import { CreateRoomDto, PublicRoom, UpdateRoomDto } from "./rooms.types";
import { PropertiesService } from "../properties/properties.service";
import { PropertiesRepository } from "../properties/properties.repository";
import { EventsPublisher } from "../events/events.publisher";
import { RoomSnapshot } from "../events/events.types";
import { RoomRow } from "../database/database.types";
import type { PublicProperty } from "../properties/properties.types";

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
    const property = await this.propertiesService.findOne(propertyId);
    const room = await this.repo.create({
      property_id: propertyId,
      room_type: dto.roomType,
      bed_type: dto.bedType,
      view_type: dto.viewType,
      capacity: dto.capacity,
      total_rooms: dto.totalRooms,
      base_price_usd: String(dto.basePriceUsd),
    });
    await this.publishRoomUpdated(room);
    return this.toPublic(room, property);
  }

  async findByProperty(propertyId: string): Promise<PublicRoom[]> {
    const property = await this.propertiesService.findOne(propertyId);
    const rows = await this.repo.findByProperty(propertyId);
    return rows.map((r) => this.toPublic(r, property));
  }

  async findOne(id: string): Promise<PublicRoom> {
    const room = await this.repo.findById(id);
    if (!room) throw new NotFoundException(`Room ${id} not found`);
    const property = await this.propertiesService.findOne(room.property_id);
    return this.toPublic(room, property);
  }

  async findOneRaw(id: string): Promise<RoomRow | undefined> {
    return this.repo.findById(id);
  }

  async update(
    id: string,
    partnerId: string,
    dto: UpdateRoomDto,
  ): Promise<PublicRoom> {
    await this.findOne(id);
    const updated = await this.repo.update(id, {
      room_type: dto.roomType,
      bed_type: dto.bedType,
      view_type: dto.viewType,
      capacity: dto.capacity,
      total_rooms: dto.totalRooms,
      status: dto.status,
      base_price_usd:
        dto.basePriceUsd !== undefined ? String(dto.basePriceUsd) : undefined,
    });
    if (!updated) throw new NotFoundException(`Room ${id} not found`);
    await this.publishRoomUpdated(updated);
    const property = await this.propertiesService.findOne(updated.property_id);
    return this.toPublic(updated, property);
  }

  async remove(id: string): Promise<void> {
    const room = await this.findOne(id);
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
      partnerId: property.partner_id,
      propertyName: property.name,
      city: property.city,
      country: property.country_code,
      neighborhood: property.neighborhood,
      lat: property.lat,
      lon: property.lon,
      roomType: room.room_type,
      bedType: room.bed_type,
      viewType: room.view_type,
      capacity: room.capacity,
      totalRooms: room.total_rooms,
      basePriceUsd: parseFloat(room.base_price_usd),
      amenities: property.amenities,
      stars: property.stars,
      rating: parseFloat(property.rating),
      reviewCount: property.review_count,
      thumbnailUrl: property.thumbnail_url,
      isActive: room.status === "active",
    };
    this.events.publish("inventory.room.upserted", {
      routingKey: "inventory.room.upserted",
      timestamp: new Date().toISOString(),
      snapshot,
    });
  }

  private toPublic(row: RoomRow, property: PublicProperty): PublicRoom {
    return {
      id: row.id,
      propertyId: row.property_id,
      roomType: row.room_type,
      bedType: row.bed_type,
      viewType: row.view_type,
      capacity: row.capacity,
      totalRooms: row.total_rooms,
      basePriceUsd: row.base_price_usd,
      status: row.status,
      country: property.countryCode,
      city: property.city,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
