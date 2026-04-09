import { Injectable, Logger } from "@nestjs/common";
import {
  PropertiesRepository,
  type RoomIndexRecord,
} from "../../properties/properties.repository.js";
import { PropertiesService } from "../../properties/properties.service.js";

export interface RoomUpsertedPayload {
  roomId: string;
  propertyId: string;
  partnerId: string;
  propertyName: string;
  city: string;
  country: string;
  neighborhood: string | null;
  lat: number | null;
  lon: number | null;
  roomType: string;
  bedType: string;
  viewType: string;
  capacity: number;
  totalRooms: number;
  basePriceUsd: number;
  amenities: string[];
  stars: number | null;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  isActive: boolean;
}

@Injectable()
export class RoomUpsertedHandler {
  private readonly logger = new Logger(RoomUpsertedHandler.name);

  constructor(
    private readonly repo: PropertiesRepository,
    private readonly properties: PropertiesService,
  ) {}

  async handle(payload: RoomUpsertedPayload): Promise<void> {
    const record: RoomIndexRecord = {
      room_id: payload.roomId,
      property_id: payload.propertyId,
      partner_id: payload.partnerId,
      property_name: payload.propertyName,
      city: payload.city,
      country: payload.country,
      neighborhood: payload.neighborhood,
      lat: payload.lat ?? 0,
      lon: payload.lon ?? 0,
      room_type: payload.roomType,
      bed_type: payload.bedType,
      view_type: payload.viewType,
      capacity: payload.capacity,
      amenities: payload.amenities,
      base_price_usd: payload.basePriceUsd,
      stars: payload.stars ?? 0,
      rating: payload.rating,
      review_count: payload.reviewCount,
      thumbnail_url: payload.thumbnailUrl,
      is_active: payload.isActive,
    };
    await this.repo.upsertRoom(record);
    await this.properties.invalidateCityCache(payload.city);
    this.logger.debug(
      `Upserted room ${payload.roomId} for city ${payload.city}`,
    );
  }
}
