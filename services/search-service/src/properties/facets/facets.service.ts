import { Injectable } from "@nestjs/common";
import type { SearchPropertiesDto } from "../dto/search-properties.dto.js";

// CandidateRoom uses snake_case to match PostgreSQL column names directly.
// It is an internal type — never serialised to the API response.
export interface CandidateRoom {
  room_id: string;
  property_id: string;
  property_name: string;
  city: string;
  country: string;
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
  avail_price_usd: string | null;
  avail_from: string | null;
  avail_to: string | null;
}

export interface PropertyResult {
  propertyId: string;
  propertyName: string;
  city: string;
  stars: number;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  amenities: string[];
  bestRoom: {
    roomId: string;
    roomType: string;
    bedType: string;
    capacity: number;
    basePriceUsd: number;
    priceUsd: number | null;
    availabilityFrom: string | null;
    availabilityTo: string | null;
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
      const price =
        room.avail_price_usd != null
          ? parseFloat(room.avail_price_usd)
          : parseFloat(room.base_price_usd);
      if (filters.priceMin != null && price < filters.priceMin) return false;
      if (filters.priceMax != null && price > filters.priceMax) return false;
      return true;
    });
  }

  computeFacets(candidates: CandidateRoom[], dto: SearchPropertiesDto): Facets {
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
        this.applyFilters(candidates, without("roomType")),
        "room_type",
      ),
      bedTypes: this.countByField(
        this.applyFilters(candidates, without("bedType")),
        "bed_type",
      ),
      viewTypes: this.countByField(
        this.applyFilters(candidates, without("viewType")),
        "view_type",
      ),
      amenities: this.countByAmenity(
        this.applyFilters(candidates, without("amenities")),
      ),
      stars: this.countByStars(this.applyFilters(candidates, without("stars"))),
      priceRange: this.computePriceRange(
        this.applyFilters(candidates, without("priceMin")),
      ),
    };
  }

  selectBestRoomPerProperty(rooms: CandidateRoom[]): PropertyResult[] {
    const byProperty = new Map<string, CandidateRoom[]>();
    for (const room of rooms) {
      const list = byProperty.get(room.property_id) ?? [];
      list.push(room);
      byProperty.set(room.property_id, list);
    }

    const results: PropertyResult[] = [];
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
        propertyId: best.property_id,
        propertyName: best.property_name,
        city: best.city,
        stars: best.stars,
        rating: parseFloat(best.rating),
        reviewCount: best.review_count,
        thumbnailUrl: best.thumbnail_url,
        amenities: [...new Set(propertyRooms.flatMap((r) => r.amenities))],
        bestRoom: {
          roomId: best.room_id,
          roomType: best.room_type,
          bedType: best.bed_type,
          capacity: best.capacity,
          basePriceUsd: parseFloat(best.base_price_usd),
          priceUsd:
            best.avail_price_usd != null
              ? parseFloat(best.avail_price_usd)
              : null,
          availabilityFrom: best.avail_from,
          availabilityTo: best.avail_to,
        },
      });
    }

    return results;
  }

  sortProperties(
    properties: PropertyResult[],
    sort: SearchPropertiesDto["sort"],
  ): PropertyResult[] {
    const copy = [...properties];
    switch (sort) {
      case "price_asc":
        copy.sort(
          (a, b) =>
            (a.bestRoom.priceUsd ?? a.bestRoom.basePriceUsd) -
            (b.bestRoom.priceUsd ?? b.bestRoom.basePriceUsd),
        );
        break;
      case "price_desc":
        copy.sort(
          (a, b) =>
            (b.bestRoom.priceUsd ?? b.bestRoom.basePriceUsd) -
            (a.bestRoom.priceUsd ?? a.bestRoom.basePriceUsd),
        );
        break;
      case "stars_desc":
        copy.sort((a, b) => b.stars - a.stars || b.rating - a.rating);
        break;
      case "relevance":
      default:
        copy.sort((a, b) => b.stars - a.stars || b.rating - a.rating);
        break;
    }
    return copy;
  }

  // ─── private helpers ───────────────────────────────────────────────────────

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

  private computePriceRange(rooms: CandidateRoom[]): {
    min: number;
    max: number;
    currency: string;
  } {
    if (rooms.length === 0) {
      return { min: 0, max: 0, currency: "USD" };
    }
    let min = Infinity;
    let max = -Infinity;
    for (const room of rooms) {
      const price =
        room.avail_price_usd != null
          ? parseFloat(room.avail_price_usd)
          : parseFloat(room.base_price_usd);
      if (price < min) min = price;
      if (price > max) max = price;
    }
    return { min, max, currency: "USD" };
  }
}
