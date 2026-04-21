import { Inject, Injectable } from "@nestjs/common";
import { Kysely, sql, type SqlBool } from "kysely";
import type { SearchDatabase } from "../database/database.types.js";
import { KYSELY } from "../database/database.provider.js";
import type { CandidateRoom } from "./facets/facets.service.js";
import type { SearchPropertiesDto } from "./dto/search-properties.dto.js";

export interface RoomIndexRecord {
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
  tax_rate_pct: number;
  flat_fee_per_night_usd: number;
  flat_fee_per_stay_usd: number;
  stars: number;
  rating: number;
  review_count: number;
  thumbnail_url: string;
  image_urls: string[];
  description: Record<string, string>;
  is_active: boolean;
}

@Injectable()
export class PropertiesRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<SearchDatabase>) {}

  async upsertRoom(r: RoomIndexRecord): Promise<void> {
    await sql`
      INSERT INTO room_search_index (
        room_id, property_id, partner_id, property_name, city, country,
        neighborhood, lat, lon, room_type, bed_type, view_type, capacity,
        amenities, base_price_usd, tax_rate_pct,
        flat_fee_per_night_usd, flat_fee_per_stay_usd,
        stars, rating, review_count,
        thumbnail_url, image_urls, description,
        is_active, last_synced_at
      ) VALUES (
        ${r.room_id}::uuid,
        ${r.property_id}::uuid,
        ${r.partner_id}::uuid,
        ${r.property_name},
        ${r.city},
        ${r.country},
        ${r.neighborhood ?? null},
        ${r.lat},
        ${r.lon},
        ${r.room_type},
        ${r.bed_type},
        ${r.view_type},
        ${r.capacity},
        ${sql.raw(`ARRAY[${r.amenities.map((a) => `'${a.replace(/'/g, "''")}'`).join(",")}]`)}::text[],
        ${r.base_price_usd},
        ${r.tax_rate_pct},
        ${r.flat_fee_per_night_usd},
        ${r.flat_fee_per_stay_usd},
        ${r.stars},
        ${r.rating},
        ${r.review_count},
        ${r.thumbnail_url},
        ${sql.raw(`ARRAY[${r.image_urls.map((u) => `'${u.replace(/'/g, "''")}'`).join(",")}]`)}::text[],
        ${JSON.stringify(r.description ?? {})}::jsonb,
        ${r.is_active},
        NOW()
      )
      ON CONFLICT (room_id) DO UPDATE SET
        property_id            = EXCLUDED.property_id,
        partner_id             = EXCLUDED.partner_id,
        property_name          = EXCLUDED.property_name,
        city                   = EXCLUDED.city,
        country                = EXCLUDED.country,
        neighborhood           = EXCLUDED.neighborhood,
        lat                    = EXCLUDED.lat,
        lon                    = EXCLUDED.lon,
        room_type              = EXCLUDED.room_type,
        bed_type               = EXCLUDED.bed_type,
        view_type              = EXCLUDED.view_type,
        capacity               = EXCLUDED.capacity,
        amenities              = EXCLUDED.amenities,
        base_price_usd         = EXCLUDED.base_price_usd,
        tax_rate_pct           = EXCLUDED.tax_rate_pct,
        flat_fee_per_night_usd = EXCLUDED.flat_fee_per_night_usd,
        flat_fee_per_stay_usd  = EXCLUDED.flat_fee_per_stay_usd,
        stars                  = EXCLUDED.stars,
        rating                 = EXCLUDED.rating,
        review_count           = EXCLUDED.review_count,
        thumbnail_url          = EXCLUDED.thumbnail_url,
        image_urls             = EXCLUDED.image_urls,
        description            = EXCLUDED.description,
        is_active              = EXCLUDED.is_active,
        last_synced_at         = NOW()
    `.execute(this.db);
  }

  async findCandidates(dto: SearchPropertiesDto): Promise<CandidateRoom[]> {
    const hasCity = !!dto.city;

    const rows = await this.db
      .selectFrom("room_search_index as rsi")
      .select([
        "rsi.room_id",
        "rsi.property_id",
        "rsi.partner_id",
        "rsi.property_name",
        "rsi.city",
        "rsi.country",
        "rsi.neighborhood",
        "rsi.stars",
        "rsi.rating",
        "rsi.review_count",
        "rsi.thumbnail_url",
        "rsi.image_urls",
        "rsi.description",
        "rsi.amenities",
        "rsi.room_type",
        "rsi.bed_type",
        "rsi.view_type",
        "rsi.capacity",
        "rsi.base_price_usd",
        "rsi.tax_rate_pct",
        "rsi.flat_fee_per_night_usd",
        "rsi.flat_fee_per_stay_usd",
        sql<string | null>`(
          SELECT rpp.price_usd::text
          FROM room_price_periods rpp
          WHERE rpp.room_id = rsi.room_id
            AND rpp.from_date <= ${dto.checkIn || "9999-12-31"}::date
            AND rpp.to_date   >= ${dto.checkOut || "0001-01-01"}::date
          LIMIT 1
        )`.as("avail_price_usd"),
      ])
      .where("rsi.is_active", "=", true)
      .where("rsi.capacity", ">=", dto.guests)
      .$if(hasCity, (qb) =>
        qb.where(
          sql<SqlBool>`(rsi.city % ${dto.city} OR rsi.property_name % ${dto.city})`,
        ),
      )
      .$if(!!dto.countryCode, (qb) =>
        qb.where("rsi.country", "=", dto.countryCode!),
      )
      .execute();

    return rows as CandidateRoom[];
  }

  async findFeatured(limit: number): Promise<CandidateRoom[]> {
    const rows = await this.db
      .selectFrom("room_search_index as rsi")
      .select([
        "rsi.room_id",
        "rsi.property_id",
        "rsi.partner_id",
        "rsi.property_name",
        "rsi.city",
        "rsi.country",
        "rsi.neighborhood",
        "rsi.stars",
        "rsi.rating",
        "rsi.review_count",
        "rsi.thumbnail_url",
        "rsi.image_urls",
        "rsi.description",
        "rsi.amenities",
        "rsi.room_type",
        "rsi.bed_type",
        "rsi.view_type",
        "rsi.capacity",
        "rsi.base_price_usd",
        "rsi.tax_rate_pct",
        "rsi.flat_fee_per_night_usd",
        "rsi.flat_fee_per_stay_usd",
        sql<string | null>`NULL`.as("avail_price_usd"),
      ])
      .where("rsi.is_active", "=", true)
      .orderBy("rsi.rating", "desc")
      .orderBy("rsi.stars", "desc")
      .limit(limit)
      .execute();

    return rows as CandidateRoom[];
  }

  async findByPropertyId(
    propertyId: string,
    opts: { checkIn?: string; checkOut?: string; guests?: number } = {},
  ): Promise<CandidateRoom[]> {
    const rows = await this.db
      .selectFrom("room_search_index as rsi")
      .select([
        "rsi.room_id",
        "rsi.property_id",
        "rsi.partner_id",
        "rsi.property_name",
        "rsi.city",
        "rsi.country",
        "rsi.neighborhood",
        "rsi.stars",
        "rsi.rating",
        "rsi.review_count",
        "rsi.thumbnail_url",
        "rsi.image_urls",
        "rsi.description",
        "rsi.amenities",
        "rsi.room_type",
        "rsi.bed_type",
        "rsi.view_type",
        "rsi.capacity",
        "rsi.base_price_usd",
        "rsi.tax_rate_pct",
        "rsi.flat_fee_per_night_usd",
        "rsi.flat_fee_per_stay_usd",
        sql<string | null>`(
          SELECT rpp.price_usd::text
          FROM room_price_periods rpp
          WHERE rpp.room_id = rsi.room_id
            AND rpp.from_date <= ${opts.checkIn || "9999-12-31"}::date
            AND rpp.to_date   >= ${opts.checkOut || "0001-01-01"}::date
          LIMIT 1
        )`.as("avail_price_usd"),
      ])
      .where("rsi.property_id", "=", propertyId)
      .where("rsi.is_active", "=", true)
      .$if(!!opts.guests, (qb) => qb.where("rsi.capacity", ">=", opts.guests!))
      .execute();

    return rows as CandidateRoom[];
  }

  async deactivateRoom(roomId: string): Promise<void> {
    await this.db
      .updateTable("room_search_index")
      .set({ is_active: false })
      .where("room_id", "=", roomId)
      .execute();
  }

  async findRoomCity(roomId: string): Promise<string | undefined> {
    const row = await this.db
      .selectFrom("room_search_index")
      .select("city")
      .where("room_id", "=", roomId)
      .executeTakeFirst();
    return row?.city;
  }

  async bulkUpdateRoomSearchIndex(
    country: string,
    city: string,
    taxRatePct: number,
  ): Promise<void> {
    const rows = await this.db
      .selectFrom("room_search_index")
      .select("room_id")
      .where("country", "=", country)
      .where(sql<boolean>`LOWER(city) = ${city.toLowerCase()}`)
      .execute();

    const ids = rows.map((r) => r.room_id);
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      await this.db
        .updateTable("room_search_index")
        .set({ tax_rate_pct: String(taxRatePct) })
        .where("room_id", "in", chunk)
        .execute();
    }
  }

  async bulkUpdateFlatFees(
    partnerId: string,
    flatFeePerNightUsd: number,
    flatFeePerStayUsd: number,
  ): Promise<void> {
    const rows = await this.db
      .selectFrom("room_search_index")
      .select("room_id")
      .where("partner_id", "=", partnerId)
      .execute();

    const ids = rows.map((r) => r.room_id);
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      await this.db
        .updateTable("room_search_index")
        .set({
          flat_fee_per_night_usd: String(flatFeePerNightUsd),
          flat_fee_per_stay_usd: String(flatFeePerStayUsd),
        })
        .where("room_id", "in", chunk)
        .execute();
    }
  }
}
