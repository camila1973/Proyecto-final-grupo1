import { Injectable, NotFoundException } from "@nestjs/common";
import { PropertiesRepository } from "./properties.repository";
import {
  CreatePropertyDto,
  PublicProperty,
  RoomSummary,
  UpdatePropertyDto,
} from "./properties.types";
import { PropertyRow, RoomRow } from "../database/database.types";
import { EventsPublisher } from "../events/events.publisher";
import type { RoomSnapshot } from "../events/events.types";

@Injectable()
export class PropertiesService {
  constructor(
    private readonly repo: PropertiesRepository,
    private readonly events: EventsPublisher,
  ) {}

  async create(
    partnerId: string,
    dto: CreatePropertyDto,
  ): Promise<PublicProperty> {
    const property = await this.repo.create({
      name: dto.name,
      type: dto.type,
      city: dto.city,
      stars: dto.stars,
      country_code: dto.countryCode,
      partner_id: partnerId,
      neighborhood: dto.neighborhood,
      lat: dto.lat,
      lon: dto.lon,
      rating: dto.rating !== undefined ? String(dto.rating) : undefined,
      review_count: dto.reviewCount,
      thumbnail_url: dto.thumbnailUrl,
      amenities: dto.amenities,
    });
    return this.toPublic(property);
  }

  async findAll(
    partnerId: string,
    city?: string,
    status?: string,
  ): Promise<PublicProperty[]> {
    const rows = await this.repo.findAll(partnerId, { city, status });
    return rows.map((r) => this.toPublic(r));
  }

  async findOne(id: string): Promise<PublicProperty> {
    const property = await this.repo.findById(id);
    if (!property) throw new NotFoundException(`Property ${id} not found`);
    return this.toPublic(property);
  }

  async findDetail(id: string): Promise<PublicProperty | null> {
    const result = await this.repo.findByIdWithRooms(id);
    if (!result) return null;
    return this.toPublicDetail(result.property, result.rooms);
  }

  async update(id: string, dto: UpdatePropertyDto): Promise<PublicProperty> {
    const updated = await this.repo.update(id, {
      name: dto.name,
      type: dto.type,
      city: dto.city,
      stars: dto.stars,
      status: dto.status,
      country_code: dto.countryCode,
      neighborhood: dto.neighborhood,
      lat: dto.lat,
      lon: dto.lon,
      rating: dto.rating !== undefined ? String(dto.rating) : undefined,
      review_count: dto.reviewCount,
      thumbnail_url: dto.thumbnailUrl,
      amenities: dto.amenities,
    });
    if (!updated) throw new NotFoundException(`Property ${id} not found`);
    await this.publishRoomsUpdated(updated);
    return this.toPublic(updated);
  }

  async remove(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }

  private async publishRoomsUpdated(property: PropertyRow): Promise<void> {
    const result = await this.repo.findByIdWithRooms(property.id);
    if (!result) return;
    for (const room of result.rooms) {
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
  }

  private toPublic(row: PropertyRow): PublicProperty {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      city: row.city,
      stars: row.stars,
      status: row.status,
      countryCode: row.country_code,
      partnerId: row.partner_id,
      neighborhood: row.neighborhood,
      lat: row.lat,
      lon: row.lon,
      rating: parseFloat(row.rating),
      reviewCount: row.review_count,
      thumbnailUrl: row.thumbnail_url,
      amenities: row.amenities,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toPublicDetail(
    property: PropertyRow,
    rooms: RoomRow[],
  ): PublicProperty {
    const roomSummaries: RoomSummary[] = rooms.map((r) => ({
      roomId: r.id,
      roomType: r.room_type,
      bedType: r.bed_type,
      viewType: r.view_type,
      capacity: r.capacity,
      basePriceUsd: parseFloat(r.base_price_usd),
    }));
    return {
      ...this.toPublic(property),
      rooms: roomSummaries,
    };
  }
}
