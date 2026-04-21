import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { PropertiesRepository } from "./properties.repository.js";
import { ReviewsRepository } from "./reviews.repository.js";
import { CacheService } from "../cache/cache.service.js";
import { FacetsService } from "./facets/facets.service.js";
import { InventoryClientService } from "../inventory/inventory-client.service.js";
import type { SearchPropertiesDto } from "./dto/search-properties.dto.js";
import type {
  PropertyRoomsDto,
  PropertyReviewsQueryDto,
} from "./dto/property-rooms.dto.js";
import { City } from "country-state-city";

const CACHE_TTL = 60 * 5; // 5 minutes
const DETAIL_CACHE_TTL = 60; // 1 minute — detail must feel real-time
const REVIEWS_CACHE_TTL = 60 * 10; // 10 minutes — reviews change slowly

const SUPPORTED_LANGUAGES = ["es", "en", "pt", "fr", "it", "de"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
const DEFAULT_LANGUAGE: SupportedLanguage = "es";

function pickLocalized(
  map: Record<string, string> | null | undefined,
  language: string | undefined,
): string {
  if (!map) return "";
  const lang = (language ?? "").toLowerCase().slice(0, 2);
  if (lang && map[lang]) return map[lang];
  if (map[DEFAULT_LANGUAGE]) return map[DEFAULT_LANGUAGE];
  const first = Object.values(map)[0];
  return first ?? "";
}

@Injectable()
export class PropertiesService {
  constructor(
    private readonly repo: PropertiesRepository,
    private readonly reviewsRepo: ReviewsRepository,
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

    const filtered = this.facets.applyFilters(
      available,
      {
        roomType: dto.exact ? dto.roomType : undefined,
        bedType: dto.exact ? dto.bedType : undefined,
        viewType: dto.exact ? dto.viewType : undefined,
        amenities: dto.exact ? dto.amenities : undefined,
        stars: dto.stars,
        priceMin: dto.priceMin,
        priceMax: dto.priceMax,
      },
      nights,
    );

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
    const language = this.normalizeLanguage(dto.language);
    const cacheKey = this.buildDetailCacheKey(propertyId, dto, language);
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
      // Property may still exist but be sold out — return property shell if we
      // loaded any candidates (before availability filter), otherwise null.
      if (candidates.length === 0) {
        return { property: null, rooms: [] };
      }
      const property = this.buildPropertyShell(candidates[0], language);
      const response = { property, rooms: [] };
      await this.cache.set(
        cacheKey,
        JSON.stringify(response),
        DETAIL_CACHE_TTL,
      );
      return response;
    }

    // All rooms share the same property — hoist it to the top level
    const { property: rawProperty } = roomResults[0];
    const property = {
      ...rawProperty,
      description: pickLocalized(rawProperty.description, language),
      descriptionByLang: rawProperty.description,
    };
    const rooms = roomResults.map(
      ({ property: _, _partnerId: __, ...roomFields }) => roomFields,
    );

    const response = { property, rooms };
    await this.cache.set(cacheKey, JSON.stringify(response), DETAIL_CACHE_TTL);
    return response;
  }

  async getPropertyReviews(propertyId: string, dto: PropertyReviewsQueryDto) {
    const language = dto.language
      ? this.normalizeLanguage(dto.language)
      : undefined;
    const cacheKey = `search:reviews:${propertyId}:${language ?? "*"}:${dto.page}:${dto.pageSize}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as object;
    }

    const [rows, summary] = await Promise.all([
      this.reviewsRepo.findByPropertyId(propertyId, {
        page: dto.page,
        pageSize: dto.pageSize,
        language,
      }),
      this.reviewsRepo.aggregate(propertyId, language),
    ]);

    const totalPages =
      summary.totalReviews === 0
        ? 0
        : Math.ceil(summary.totalReviews / dto.pageSize);

    const response = {
      meta: {
        page: dto.page,
        pageSize: dto.pageSize,
        total: summary.totalReviews,
        totalPages,
        averageRating: Math.round(summary.averageRating * 10) / 10,
      },
      reviews: rows.map((r) => ({
        id: r.id,
        reviewerName: r.reviewer_name,
        reviewerCountry: r.reviewer_country,
        rating: r.rating,
        language: r.language,
        title: r.title,
        comment: r.comment,
        createdAt: r.created_at,
      })),
    };

    await this.cache.set(cacheKey, JSON.stringify(response), REVIEWS_CACHE_TTL);
    return response;
  }

  private buildPropertyShell(
    row: import("./facets/facets.service.js").CandidateRoom,
    language: string,
  ) {
    return {
      id: row.property_id,
      name: row.property_name,
      city: row.city,
      countryCode: row.country,
      neighborhood: row.neighborhood,
      stars: row.stars,
      rating: parseFloat(row.rating),
      reviewCount: row.review_count,
      thumbnailUrl: row.thumbnail_url,
      imageUrls: row.image_urls ?? [],
      description: pickLocalized(row.description, language),
      descriptionByLang: row.description ?? {},
      amenities: row.amenities,
    };
  }

  private buildDetailCacheKey(
    propertyId: string,
    dto: PropertyRoomsDto,
    language: string,
  ): string {
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          propertyId,
          checkIn: dto.checkIn,
          checkOut: dto.checkOut,
          guests: dto.guests,
          language,
        }),
      )
      .digest("hex")
      .slice(0, 16);
    return `search:property-detail:${propertyId}:${fingerprint}`;
  }

  private normalizeLanguage(raw: string | undefined): string {
    const lang = (raw ?? "").toLowerCase().slice(0, 2);
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang)
      ? lang
      : DEFAULT_LANGUAGE;
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
