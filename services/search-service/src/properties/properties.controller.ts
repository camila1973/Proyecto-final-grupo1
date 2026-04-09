import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";
import { PropertiesService } from "./properties.service.js";
import type {
  SearchPropertiesDto,
  SortOption,
} from "./dto/search-properties.dto.js";

const VALID_SORTS: SortOption[] = [
  "price_asc",
  "price_desc",
  "stars_desc",
  "relevance",
];

@Controller()
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get("featured")
  getFeatured(@Query("limit") limit?: string) {
    const size = limit ? Math.min(20, Math.max(1, parseInt(limit, 10))) : 6;
    return this.propertiesService.getFeatured(size);
  }

  @Get("properties")
  searchProperties(@Query() query: Record<string, string>) {
    const dto = this.parseQuery(query);
    return this.propertiesService.searchProperties(dto);
  }

  @Get("properties/:propertyId/rooms")
  getPropertyRooms(
    @Param("propertyId") propertyId: string,
    @Query() query: Record<string, string>,
  ) {
    const { checkIn, checkOut, guests } = query;

    if (checkIn && isNaN(new Date(checkIn).getTime())) {
      throw new BadRequestException("checkIn must be a valid ISO 8601 date");
    }
    if (checkOut && isNaN(new Date(checkOut).getTime())) {
      throw new BadRequestException("checkOut must be a valid ISO 8601 date");
    }
    if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
      throw new BadRequestException("checkOut must be after checkIn");
    }

    const guestsNum = guests ? parseInt(guests, 10) : undefined;
    if (guestsNum !== undefined && (isNaN(guestsNum) || guestsNum < 1)) {
      throw new BadRequestException("guests must be a positive integer");
    }

    return this.propertiesService.getPropertyRooms(propertyId, {
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      guests: guestsNum,
    });
  }

  @Get("cities")
  getCitySuggestions(@Query("q") q: string) {
    if (!q?.trim()) {
      throw new BadRequestException("q is required");
    }
    return this.propertiesService.getCitySuggestions(q.trim());
  }

  private parseQuery(query: Record<string, string>): SearchPropertiesDto {
    const { city, countryCode, checkIn, checkOut, guests, page, limit, sort } =
      query;

    if (!city?.trim()) {
      throw new BadRequestException("city is required");
    }

    if (checkIn && isNaN(new Date(checkIn).getTime())) {
      throw new BadRequestException("checkIn must be a valid ISO 8601 date");
    }
    if (checkOut && isNaN(new Date(checkOut).getTime())) {
      throw new BadRequestException("checkOut must be a valid ISO 8601 date");
    }
    if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
      throw new BadRequestException("checkOut must be after checkIn");
    }

    const guestsNum = guests ? parseInt(guests, 10) : 1;
    if (isNaN(guestsNum) || guestsNum < 1) {
      throw new BadRequestException("guests must be a positive integer");
    }

    const resolvedSort = (sort as SortOption) ?? "relevance";
    if (sort && !VALID_SORTS.includes(resolvedSort)) {
      throw new BadRequestException(
        `sort must be one of: ${VALID_SORTS.join(", ")}`,
      );
    }

    const q = query as Record<string, string | string[]>;
    const starsRaw = this.parseArrayParam(q, "stars");
    const starsNums = starsRaw?.map(Number).filter((n) => !isNaN(n));

    return {
      city: city.trim(),
      countryCode: countryCode?.trim() || undefined,
      checkIn: checkIn ?? "",
      checkOut: checkOut ?? "",
      guests: guestsNum,
      page: page ? Math.max(1, parseInt(page, 10)) : 1,
      pageSize: limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20,
      sort: resolvedSort,
      amenities: this.parseArrayParam(q, "amenities"),
      stars: starsNums?.length ? starsNums : undefined,
      priceMin:
        query["priceMin"] != null ? parseFloat(query["priceMin"]) : undefined,
      priceMax:
        query["priceMax"] != null ? parseFloat(query["priceMax"]) : undefined,
      roomType: this.parseArrayParam(q, "roomType"),
      bedType: this.parseArrayParam(q, "bedType"),
      viewType: this.parseArrayParam(q, "viewType"),
      exact: query["exact"] === "true",
    };
  }

  private parseArrayParam(
    query: Record<string, string | string[]>,
    key: string,
  ): string[] | undefined {
    const raw = query[key] ?? query[`${key}[]`];
    if (raw == null) return undefined;
    const arr = Array.isArray(raw)
      ? raw.flatMap((v) => v.split(","))
      : raw.split(",");
    const result = arr.filter(Boolean);
    return result.length ? result : undefined;
  }
}
