import { Injectable } from "@nestjs/common";
import type { SearchPropertiesDto } from "../dto/search-properties.dto.js";

// CandidateRoom uses snake_case to match PostgreSQL column names directly.
// It is an internal type — never serialised to the API response.
export interface CandidateRoom {
  room_id: string;
  property_id: string;
  partner_id: string;
  property_name: string;
  city: string;
  country: string;
  neighborhood: string | null;
  stars: number;
  rating: string;
  review_count: number;
  thumbnail_url: string;
  amenities: string[];
  room_type: string;
  bed_type: string;
  view_type: string;
  capacity: number;
  base_price_usd: string;
  tax_rate_pct: string;
  flat_fee_per_night_usd: string;
  flat_fee_per_stay_usd: string;
  avail_price_usd: string | null;
}

export interface RoomSearchResult {
  roomId: string;
  roomType: string;
  bedType: string;
  viewType: string;
  capacity: number;
  basePriceUsd: number;
  priceUsd: number | null;
  taxRatePct: number;
  estimatedTotalUsd: number;
  hasFlatFees: boolean;
  /** Internal field used for flat fee enrichment — not in final API response shape */
  _partnerId?: string;
  property: {
    id: string;
    name: string;
    city: string;
    countryCode: string;
    neighborhood: string | null;
    stars: number;
    rating: number;
    reviewCount: number;
    thumbnailUrl: string;
    amenities: string[];
  };
}

export interface FacetCount {
  id: string;
  count: number;
}

export interface StarFacetCount {
  id: number;
  count: number;
}

export interface Facets {
  roomTypes: FacetCount[];
  bedTypes: FacetCount[];
  viewTypes: FacetCount[];
  amenities: FacetCount[];
  stars: StarFacetCount[];
  priceRange: { min: number; max: number; currency: string };
}

type FilterSet = Pick<
  SearchPropertiesDto,
  | "roomType"
  | "bedType"
  | "viewType"
  | "amenities"
  | "stars"
  | "priceMin"
  | "priceMax"
>;

@Injectable()
export class FacetsService {
  applyFilters(
    rooms: CandidateRoom[],
    filters: Partial<FilterSet>,
    nights = 0,
  ): CandidateRoom[] {
    return rooms.filter((room) => {
      if (
        filters.roomType?.length &&
        !filters.roomType.includes(room.room_type)
      ) {
        return false;
      }
      if (filters.bedType?.length && !filters.bedType.includes(room.bed_type)) {
        return false;
      }
      if (
        filters.viewType?.length &&
        !filters.viewType.includes(room.view_type)
      ) {
        return false;
      }
      if (
        filters.amenities?.length &&
        !filters.amenities.every((a) => room.amenities.includes(a))
      ) {
        return false;
      }
      if (filters.stars?.length && !filters.stars.includes(room.stars)) {
        return false;
      }
      const { estimatedTotalUsd } = this.computePricing(room, nights);
      if (filters.priceMin != null && estimatedTotalUsd < filters.priceMin)
        return false;
      if (filters.priceMax != null && estimatedTotalUsd > filters.priceMax)
        return false;
      return true;
    });
  }

  computeFacets(candidates: CandidateRoom[], dto: SearchPropertiesDto): Facets {
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

    const base: FilterSet = {
      roomType: dto.roomType,
      bedType: dto.bedType,
      viewType: dto.viewType,
      amenities: dto.amenities,
      stars: dto.stars,
      priceMin: dto.priceMin,
      priceMax: dto.priceMax,
    };

    const without = (key: keyof FilterSet): Partial<FilterSet> => {
      const copy = { ...base };
      delete copy[key];
      return copy;
    };

    return {
      roomTypes: this.countByField(
        this.applyFilters(candidates, without("roomType"), nights),
        "room_type",
      ),
      bedTypes: this.countByField(
        this.applyFilters(candidates, without("bedType"), nights),
        "bed_type",
      ),
      viewTypes: this.countByField(
        this.applyFilters(candidates, without("viewType"), nights),
        "view_type",
      ),
      amenities: this.countByAmenity(
        this.applyFilters(candidates, without("amenities"), nights),
      ),
      stars: this.countByStars(
        this.applyFilters(candidates, without("stars"), nights),
      ),
      priceRange: this.computePriceRange(
        this.applyFilters(
          candidates,
          { ...without("priceMin"), priceMax: undefined },
          nights,
        ),
        nights,
      ),
    };
  }

  selectCheapestRoomPerProperty(
    rooms: CandidateRoom[],
    nights = 0,
  ): RoomSearchResult[] {
    const byProperty = new Map<string, CandidateRoom[]>();
    for (const room of rooms) {
      const list = byProperty.get(room.property_id) ?? [];
      list.push(room);
      byProperty.set(room.property_id, list);
    }

    const results: RoomSearchResult[] = [];
    for (const [, propertyRooms] of byProperty) {
      const best = propertyRooms.reduce((cheapest, room) => {
        const cp =
          cheapest.avail_price_usd != null
            ? parseFloat(cheapest.avail_price_usd)
            : parseFloat(cheapest.base_price_usd);
        const rp =
          room.avail_price_usd != null
            ? parseFloat(room.avail_price_usd)
            : parseFloat(room.base_price_usd);
        return rp < cp ? room : cheapest;
      });

      results.push({
        ...this.computePricing(best, nights),
        roomId: best.room_id,
        roomType: best.room_type,
        bedType: best.bed_type,
        viewType: best.view_type,
        capacity: best.capacity,
        _partnerId: best.partner_id,
        property: {
          id: best.property_id,
          name: best.property_name,
          city: best.city,
          countryCode: best.country,
          neighborhood: best.neighborhood,
          stars: best.stars,
          rating: parseFloat(best.rating),
          reviewCount: best.review_count,
          thumbnailUrl: best.thumbnail_url,
          amenities: [...new Set(propertyRooms.flatMap((r) => r.amenities))],
        },
      });
    }

    return results;
  }

  /**
   * Maps every candidate room to a RoomSearchResult without grouping by property.
   * All rooms must belong to the same property — property.amenities is the union
   * across all of them.
   */
  mapAllRooms(rooms: CandidateRoom[], nights = 0): RoomSearchResult[] {
    if (rooms.length === 0) return [];

    const propertyAmenities = [...new Set(rooms.flatMap((r) => r.amenities))];
    const first = rooms[0];

    return rooms.map((room) => ({
      ...this.computePricing(room, nights),
      roomId: room.room_id,
      roomType: room.room_type,
      bedType: room.bed_type,
      viewType: room.view_type,
      capacity: room.capacity,
      _partnerId: room.partner_id,
      property: {
        id: first.property_id,
        name: first.property_name,
        city: first.city,
        countryCode: first.country,
        neighborhood: first.neighborhood,
        stars: first.stars,
        rating: parseFloat(first.rating),
        reviewCount: first.review_count,
        thumbnailUrl: first.thumbnail_url,
        amenities: propertyAmenities,
      },
    }));
  }

  sortRooms(
    rooms: RoomSearchResult[],
    sort: SearchPropertiesDto["sort"],
  ): RoomSearchResult[] {
    const copy = [...rooms];
    switch (sort) {
      case "price_asc":
        copy.sort(
          (a, b) =>
            (a.priceUsd ?? a.basePriceUsd) - (b.priceUsd ?? b.basePriceUsd),
        );
        break;
      case "price_desc":
        copy.sort(
          (a, b) =>
            (b.priceUsd ?? b.basePriceUsd) - (a.priceUsd ?? a.basePriceUsd),
        );
        break;
      case "stars_desc":
        copy.sort(
          (a, b) =>
            b.property.stars - a.property.stars ||
            b.property.rating - a.property.rating,
        );
        break;
      case "relevance":
      default:
        copy.sort(
          (a, b) =>
            b.property.stars - a.property.stars ||
            b.property.rating - a.property.rating,
        );
        break;
    }
    return copy;
  }

  // ─── private helpers ───────────────────────────────────────────────────────

  private computePricing(
    room: CandidateRoom,
    nights: number,
  ): Pick<
    RoomSearchResult,
    | "basePriceUsd"
    | "priceUsd"
    | "taxRatePct"
    | "estimatedTotalUsd"
    | "hasFlatFees"
  > {
    const price =
      room.avail_price_usd != null
        ? parseFloat(room.avail_price_usd)
        : parseFloat(room.base_price_usd);
    const taxRatePct = parseFloat(room.tax_rate_pct ?? "0");
    const flatPerNight = parseFloat(room.flat_fee_per_night_usd ?? "0");
    const flatPerStay = parseFloat(room.flat_fee_per_stay_usd ?? "0");
    const hasFlatFees = flatPerNight > 0 || flatPerStay > 0;
    const estimatedTotalUsd =
      nights > 0
        ? price * nights * (1 + taxRatePct / 100) +
          flatPerNight * nights +
          flatPerStay
        : price * (1 + taxRatePct / 100) + flatPerNight;
    return {
      basePriceUsd: parseFloat(room.base_price_usd),
      priceUsd:
        room.avail_price_usd != null ? parseFloat(room.avail_price_usd) : null,
      taxRatePct,
      estimatedTotalUsd,
      hasFlatFees,
    };
  }

  private countByField(
    rooms: CandidateRoom[],
    field: "room_type" | "bed_type" | "view_type",
  ): FacetCount[] {
    const propsByValue = new Map<string, Set<string>>();
    for (const room of rooms) {
      const val = room[field];
      const set = propsByValue.get(val) ?? new Set();
      set.add(room.property_id);
      propsByValue.set(val, set);
    }
    return Array.from(propsByValue.entries())
      .map(([id, props]) => ({ id, count: props.size }))
      .sort((a, b) => b.count - a.count);
  }

  private countByAmenity(rooms: CandidateRoom[]): FacetCount[] {
    const propsByAmenity = new Map<string, Set<string>>();
    for (const room of rooms) {
      for (const amenity of room.amenities) {
        const set = propsByAmenity.get(amenity) ?? new Set();
        set.add(room.property_id);
        propsByAmenity.set(amenity, set);
      }
    }
    return Array.from(propsByAmenity.entries())
      .map(([id, props]) => ({ id, count: props.size }))
      .sort((a, b) => b.count - a.count);
  }

  private countByStars(rooms: CandidateRoom[]): StarFacetCount[] {
    const propsByStars = new Map<number, Set<string>>();
    for (const room of rooms) {
      const set = propsByStars.get(room.stars) ?? new Set();
      set.add(room.property_id);
      propsByStars.set(room.stars, set);
    }
    return Array.from(propsByStars.entries())
      .map(([id, props]) => ({ id, count: props.size }))
      .sort((a, b) => b.id - a.id);
  }

  private computePriceRange(
    rooms: CandidateRoom[],
    nights = 0,
  ): { min: number; max: number; currency: string } {
    if (rooms.length === 0) {
      return { min: 0, max: 0, currency: "USD" };
    }
    let min = Infinity;
    let max = -Infinity;
    for (const room of rooms) {
      const { estimatedTotalUsd } = this.computePricing(room, nights);
      if (estimatedTotalUsd < min) min = estimatedTotalUsd;
      if (estimatedTotalUsd > max) max = estimatedTotalUsd;
    }
    return { min, max, currency: "USD" };
  }
}
