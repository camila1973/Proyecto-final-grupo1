import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { PropertiesRepository } from "./properties.repository.js";
import { CacheService } from "../cache/cache.service.js";
import { FacetsService } from "./facets/facets.service.js";
import { InventoryClientService } from "../inventory/inventory-client.service.js";
import type { SearchPropertiesDto } from "./dto/search-properties.dto.js";
import type { PropertyRoomsDto } from "./dto/property-rooms.dto.js";
import { City } from "country-state-city";

const CACHE_TTL = 60 * 5; // 5 minutes

@Injectable()
export class PropertiesService {
  constructor(
    private readonly repo: PropertiesRepository,
    private readonly cache: CacheService,
    private readonly facets: FacetsService,
    private readonly inventoryClient: InventoryClientService,
  ) {}

  async searchProperties(dto: SearchPropertiesDto) {
    const cacheKey = this.buildCacheKey(dto);

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as object;
    }

    const nights =
      dto.checkIn && dto.checkOut
        ? Math.max(
            0,
            Math.round(
              (new Date(dto.checkOut).getTime() -
                new Date(dto.checkIn).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 0;

    const candidates = await this.repo.findCandidates(dto);

    let available = candidates;
    if (dto.checkIn && dto.checkOut && candidates.length > 0) {
      const candidateIds = candidates.map((r) => r.room_id);
      const availableRooms = await this.inventoryClient.checkAvailability({
        roomIds: candidateIds,
        fromDate: dto.checkIn,
        toDate: dto.checkOut,
      });
      const availableIds = new Set(availableRooms.map((r) => r.roomId));
      available = candidates.filter((r) => availableIds.has(r.room_id));
    }

    const filtered = this.facets.applyFilters(available, {
      roomType: dto.exact ? dto.roomType : undefined,
      bedType: dto.exact ? dto.bedType : undefined,
      viewType: dto.exact ? dto.viewType : undefined,
      amenities: dto.exact ? dto.amenities : undefined,
      stars: dto.exact ? dto.stars : undefined,
      priceMin: dto.priceMin,
      priceMax: dto.priceMax,
    });

    const facetData = this.facets.computeFacets(available, dto);
    const rooms = this.facets.selectCheapestRoomPerProperty(filtered, nights);

    const sorted = this.facets.sortRooms(rooms, dto.sort);

    const total = sorted.length;
    const offset = (dto.page - 1) * dto.pageSize;
    const paginated = sorted.slice(offset, offset + dto.pageSize);

    // Strip internal _partnerId before serializing
    const results = paginated.map(({ _partnerId: _, ...rest }) => rest);

    const response = {
      meta: {
        total,
        page: dto.page,
        pageSize: dto.pageSize,
        totalPages: Math.ceil(total / dto.pageSize),
        searchId: randomUUID(),
      },
      results,
      facets: facetData,
    };

    await this.cache.set(cacheKey, JSON.stringify(response), CACHE_TTL);
    return response;
  }

  getCitySuggestions(
    q: string,
    limit = 8,
  ): {
    suggestions: {
      id: string;
      city: string;
      country: string;
      latitude?: string;
      longitude?: string;
    }[];
  } {
    const normalized = this.stripAccents(q.toLowerCase());
    const suggestions: {
      id: string;
      city: string;
      country: string;
      latitude?: string;
      longitude?: string;
    }[] = [];

    for (const entry of City.getAllCities()) {
      if (this.stripAccents(entry.name.toLowerCase()).startsWith(normalized)) {
        suggestions.push({
          id: this.buildCityId(entry.name, entry.stateCode, entry.countryCode),
          city: entry.name,
          country: entry.countryCode,
          latitude: entry.latitude ?? undefined,
          longitude: entry.longitude ?? undefined,
        });
        if (suggestions.length === limit) break;
      }
    }

    return { suggestions };
  }

  async getFeatured(limit: number) {
    const cacheKey = `search:featured:${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached) as object;

    const candidates = await this.repo.findFeatured(limit * 5);
    const rooms = this.facets.selectCheapestRoomPerProperty(candidates, 0);
    const sorted = this.facets.sortRooms(rooms, "relevance");
    const results = sorted
      .slice(0, limit)
      .map(({ _partnerId: _, ...rest }) => rest);

    const response = {
      results,
      meta: { total: results.length, page: 1, pageSize: limit },
    };
    await this.cache.set(cacheKey, JSON.stringify(response), CACHE_TTL);
    return response;
  }

  async getPropertyRooms(propertyId: string, dto: PropertyRoomsDto) {
    const nights =
      dto.checkIn && dto.checkOut
        ? Math.max(
            0,
            Math.round(
              (new Date(dto.checkOut).getTime() -
                new Date(dto.checkIn).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 0;

    const candidates = await this.repo.findByPropertyId(propertyId, {
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      guests: dto.guests,
    });

    let available = candidates;
    if (dto.checkIn && dto.checkOut && candidates.length > 0) {
      const candidateIds = candidates.map((r) => r.room_id);
      const availableRooms = await this.inventoryClient.checkAvailability({
        roomIds: candidateIds,
        fromDate: dto.checkIn,
        toDate: dto.checkOut,
      });
      const availableIds = new Set(availableRooms.map((r) => r.roomId));
      available = candidates.filter((r) => availableIds.has(r.room_id));
    }

    const roomResults = this.facets.mapAllRooms(available, nights);

    if (roomResults.length === 0) {
      return { property: null, rooms: [] };
    }

    // All rooms share the same property — hoist it to the top level
    const { property } = roomResults[0];
    const rooms = roomResults.map(
      ({ property: _, _partnerId: __, ...roomFields }) => roomFields,
    );

    return { property, rooms };
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
          countryCode: dto.countryCode,
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

  private buildCityId(
    name: string,
    stateCode: string,
    countryCode: string,
  ): string {
    const slug = (s: string) =>
      this.stripAccents(s).toLowerCase().trim().replace(/[\s]+/g, "-");
    return `${slug(countryCode)}-${slug(stateCode)}-${slug(name)}`;
  }

  private normalizeCity(city: string): string {
    return this.stripAccents(city).toLowerCase().trim().replace(/\s+/g, "_");
  }

  private stripAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
}
