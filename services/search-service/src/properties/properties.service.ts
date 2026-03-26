import { Injectable } from "@nestjs/common";
import { sql, type SqlBool } from "kysely";
import { createHash, randomUUID } from "crypto";
import { DatabaseService } from "../database/database.service.js";
import { CacheService } from "../cache/cache.service.js";
import { FacetsService } from "./facets/facets.service.js";
import type { CandidateRoom } from "./facets/facets.service.js";
import type { SearchPropertiesDto } from "./dto/search-properties.dto.js";

const CACHE_TTL = 60 * 5; // 5 minutes

@Injectable()
export class PropertiesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CacheService,
    private readonly facets: FacetsService,
  ) {}

  async searchProperties(dto: SearchPropertiesDto) {
    const cacheKey = this.buildCacheKey(dto);

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as object;
    }

    const candidates = await this.fetchCandidates(dto);

    const filtered = this.facets.applyFilters(candidates, {
      roomType: dto.roomType,
      bedType: dto.bedType,
      viewType: dto.viewType,
      amenities: dto.amenities,
      stars: dto.stars,
      priceMin: dto.priceMin,
      priceMax: dto.priceMax,
    });

    const facetData = this.facets.computeFacets(candidates, dto);
    const properties = this.facets.selectBestRoomPerProperty(filtered);
    const sorted = this.facets.sortProperties(properties, dto.sort);

    const total = sorted.length;
    const offset = (dto.page - 1) * dto.pageSize;
    const paginated = sorted.slice(offset, offset + dto.pageSize);

    const response = {
      meta: {
        total,
        page: dto.page,
        pageSize: dto.pageSize,
        totalPages: Math.ceil(total / dto.pageSize),
        searchId: randomUUID(),
      },
      results: paginated,
      facets: facetData,
    };

    await this.cache.set(cacheKey, JSON.stringify(response), CACHE_TTL);
    return response;
  }

  async getPropertyById(propertyId: string) {
    const cacheKey = `search:property:${propertyId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as object;
    }

    const rows = await this.db.db
      .selectFrom("room_search_index as rsi")
      .leftJoin("room_availability as ra", "ra.room_id", "rsi.room_id")
      .select([
        "rsi.room_id",
        "rsi.property_id",
        "rsi.property_name",
        "rsi.city",
        "rsi.country",
        "rsi.neighborhood",
        "rsi.lat",
        "rsi.lon",
        "rsi.stars",
        "rsi.rating",
        "rsi.review_count",
        "rsi.thumbnail_url",
        "rsi.amenities",
        "rsi.room_type",
        "rsi.bed_type",
        "rsi.view_type",
        "rsi.capacity",
        "rsi.base_price_usd",
        "ra.price_usd as avail_price_usd",
        "ra.from_date as avail_from",
        "ra.to_date as avail_to",
      ])
      .where("rsi.property_id", "=", propertyId)
      .where("rsi.is_active", "=", true)
      .execute();

    if (rows.length === 0) {
      return null;
    }

    const first = rows[0];
    const allAmenities = [...new Set(rows.flatMap((r) => r.amenities))];
    const rooms = rows.map((r) => ({
      roomId: r.room_id,
      roomType: r.room_type,
      bedType: r.bed_type,
      viewType: r.view_type,
      capacity: r.capacity,
      basePriceUsd: parseFloat(r.base_price_usd),
      priceUsd:
        r.avail_price_usd != null ? parseFloat(r.avail_price_usd) : null,
      availabilityFrom: r.avail_from ?? null,
      availabilityTo: r.avail_to ?? null,
    }));

    const response = {
      propertyId: first.property_id,
      propertyName: first.property_name,
      city: first.city,
      country: first.country,
      neighborhood: first.neighborhood ?? null,
      lat: first.lat,
      lon: first.lon,
      stars: first.stars,
      rating: parseFloat(first.rating),
      reviewCount: first.review_count,
      thumbnailUrl: first.thumbnail_url,
      amenities: allAmenities,
      rooms,
    };

    await this.cache.set(cacheKey, JSON.stringify(response), CACHE_TTL);
    return response;
  }

  async invalidateCityCache(city: string): Promise<void> {
    const pattern = `search:properties:${this.normalizeCity(city)}:*`;
    await this.cache.scanDel(pattern);
  }

  // ─── private helpers ──────────────────────────────────────────────────────

  private async fetchCandidates(
    dto: SearchPropertiesDto,
  ): Promise<CandidateRoom[]> {
    const hasDates = !!dto.checkIn && !!dto.checkOut;
    const hasCity = !!dto.city;

    const rows = await this.db.db
      .selectFrom("room_search_index as rsi")
      .leftJoin("room_availability as ra", (join) => {
        let j = join.onRef("ra.room_id", "=", "rsi.room_id");
        if (hasDates) {
          j = j
            .on(sql`ra.from_date <= ${dto.checkIn}::date`)
            .on(sql`ra.to_date >= ${dto.checkOut}::date`);
        }
        return j;
      })
      .select([
        "rsi.room_id",
        "rsi.property_id",
        "rsi.property_name",
        "rsi.city",
        "rsi.country",
        "rsi.stars",
        "rsi.rating",
        "rsi.review_count",
        "rsi.thumbnail_url",
        "rsi.amenities",
        "rsi.room_type",
        "rsi.bed_type",
        "rsi.view_type",
        "rsi.capacity",
        "rsi.base_price_usd",
        "ra.price_usd as avail_price_usd",
        "ra.from_date as avail_from",
        "ra.to_date as avail_to",
      ])
      .where("rsi.is_active", "=", true)
      .where("rsi.capacity", ">=", dto.guests)
      .$if(hasCity, (qb) =>
        qb.where(
          sql<SqlBool>`(rsi.city % ${dto.city} OR rsi.property_name % ${dto.city})`,
        ),
      )
      .execute();

    return rows as CandidateRoom[];
  }

  private buildCacheKey(dto: SearchPropertiesDto): string {
    const city = this.normalizeCity(dto.city);
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          checkIn: dto.checkIn,
          checkOut: dto.checkOut,
          guests: dto.guests,
          sort: dto.sort,
          roomType: dto.roomType?.slice().sort(),
          bedType: dto.bedType?.slice().sort(),
          viewType: dto.viewType?.slice().sort(),
          amenities: dto.amenities?.slice().sort(),
          stars: dto.stars?.slice().sort(),
          priceMin: dto.priceMin,
          priceMax: dto.priceMax,
          page: dto.page,
          pageSize: dto.pageSize,
        }),
      )
      .digest("hex")
      .slice(0, 16);

    return `search:properties:${city}:${fingerprint}`;
  }

  private normalizeCity(city: string): string {
    return city.toLowerCase().trim().replace(/\s+/g, "_");
  }
}
