import { Injectable, Logger } from "@nestjs/common";
import { sql } from "kysely";
import { DatabaseService } from "../../database/database.service.js";
import { PropertiesService } from "../../properties/properties.service.js";

export interface RoomUpsertedPayload {
  room_id: string;
  property_id: string;
  partner_id: string;
  property_name: string;
  city: string;
  country: string;
  neighborhood: string | null;
  lat: number;
  lon: number;
  room_type: string;
  bed_type: string;
  view_type: string;
  capacity: number;
  amenities: string[];
  base_price_usd: number;
  stars: number;
  rating: number;
  review_count: number;
  thumbnail_url: string;
  is_active: boolean;
}

@Injectable()
export class RoomUpsertedHandler {
  private readonly logger = new Logger(RoomUpsertedHandler.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly properties: PropertiesService,
  ) {}

  async handle(payload: RoomUpsertedPayload): Promise<void> {
    await sql`
      INSERT INTO room_search_index (
        room_id, property_id, partner_id, property_name, city, country,
        neighborhood, lat, lon, room_type, bed_type, view_type, capacity,
        amenities, base_price_usd, stars, rating, review_count,
        thumbnail_url, is_active, last_synced_at
      ) VALUES (
        ${payload.room_id}::uuid,
        ${payload.property_id}::uuid,
        ${payload.partner_id}::uuid,
        ${payload.property_name},
        ${payload.city},
        ${payload.country},
        ${payload.neighborhood ?? null},
        ${payload.lat},
        ${payload.lon},
        ${payload.room_type},
        ${payload.bed_type},
        ${payload.view_type},
        ${payload.capacity},
        ${sql.raw(`ARRAY[${payload.amenities.map((a) => `'${a.replace(/'/g, "''")}'`).join(",")}]`)}::text[],
        ${payload.base_price_usd},
        ${payload.stars},
        ${payload.rating},
        ${payload.review_count},
        ${payload.thumbnail_url},
        ${payload.is_active},
        NOW()
      )
      ON CONFLICT (room_id) DO UPDATE SET
        property_id    = EXCLUDED.property_id,
        partner_id     = EXCLUDED.partner_id,
        property_name  = EXCLUDED.property_name,
        city           = EXCLUDED.city,
        country        = EXCLUDED.country,
        neighborhood   = EXCLUDED.neighborhood,
        lat            = EXCLUDED.lat,
        lon            = EXCLUDED.lon,
        room_type      = EXCLUDED.room_type,
        bed_type       = EXCLUDED.bed_type,
        view_type      = EXCLUDED.view_type,
        capacity       = EXCLUDED.capacity,
        amenities      = EXCLUDED.amenities,
        base_price_usd = EXCLUDED.base_price_usd,
        stars          = EXCLUDED.stars,
        rating         = EXCLUDED.rating,
        review_count   = EXCLUDED.review_count,
        thumbnail_url  = EXCLUDED.thumbnail_url,
        is_active      = EXCLUDED.is_active,
        last_synced_at = NOW()
    `.execute(this.db.db);

    await this.properties.invalidateCityCache(payload.city);
    this.logger.debug(
      `Upserted room ${payload.room_id} for city ${payload.city}`,
    );
  }
}
