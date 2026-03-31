import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { PropertiesRepository } from "./properties.repository.js";
import { CacheService } from "../cache/cache.service.js";
import { FacetsService } from "./facets/facets.service.js";
import type { SearchPropertiesDto } from "./dto/search-properties.dto.js";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const allCities = require("cities.json") as {
  name: string;
  country: string;
}[];

const CACHE_TTL = 60 * 5; // 5 minutes

@Injectable()
export class PropertiesService {
  constructor(
    private readonly repo: PropertiesRepository,
    private readonly cache: CacheService,
    private readonly facets: FacetsService,
  ) {}

  async searchProperties(dto: SearchPropertiesDto) {
    const cacheKey = this.buildCacheKey(dto);

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as object;
    }

    const candidates = await this.repo.findCandidates(dto);

    const filtered = this.facets.applyFilters(candidates, {
      roomType: dto.exact ? dto.roomType : undefined,
      bedType: dto.exact ? dto.bedType : undefined,
      viewType: dto.exact ? dto.viewType : undefined,
      amenities: dto.exact ? dto.amenities : undefined,
      stars: dto.exact ? dto.stars : undefined,
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

    const rows = await this.repo.findByPropertyId(propertyId);

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

  getCitySuggestions(
    q: string,
    limit = 8,
  ): { suggestions: { city: string; country: string }[] } {
    const normalized = this.stripAccents(q.toLowerCase());
    const suggestions: { city: string; country: string }[] = [];

    for (const entry of allCities) {
      if (this.stripAccents(entry.name.toLowerCase()).startsWith(normalized)) {
        suggestions.push({ city: entry.name, country: entry.country });
        if (suggestions.length === limit) break;
      }
    }

    return { suggestions };
  }

  async invalidateCityCache(city: string): Promise<void> {
    const pattern = `search:properties:${this.normalizeCity(city)}:*`;
    await this.cache.scanDel(pattern);
  }

  // ─── private helpers ──────────────────────────────────────────────────────

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
          exact: dto.exact,
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

  private stripAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
}
