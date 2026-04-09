import { FacetsService } from "./facets.service.js";
import type { CandidateRoom } from "./facets.service.js";
import type { SearchPropertiesDto } from "../dto/search-properties.dto.js";

function makeRoom(overrides: Partial<CandidateRoom> = {}): CandidateRoom {
  return {
    room_id: "room-1",
    property_id: "prop-1",
    partner_id: "partner-1",
    property_name: "Hotel A",
    city: "Lisbon",
    country: "Portugal",
    stars: 4,
    rating: "4.2",
    review_count: 100,
    thumbnail_url: "https://example.com/img.jpg",
    amenities: ["wifi", "pool"],
    neighborhood: null,
    room_type: "suite",
    bed_type: "king",
    view_type: "ocean",
    capacity: 2,
    base_price_usd: "150.00",
    avail_price_usd: null,
    tax_rate_pct: "16",
    ...overrides,
  };
}

function makeDto(
  overrides: Partial<SearchPropertiesDto> = {},
): SearchPropertiesDto {
  return {
    city: "Lisbon",
    checkIn: "2026-04-01",
    checkOut: "2026-04-05",
    guests: 2,
    page: 1,
    pageSize: 20,
    sort: "relevance",
    ...overrides,
  };
}

describe("FacetsService", () => {
  let service: FacetsService;

  beforeEach(() => {
    service = new FacetsService();
  });

  // ─── applyFilters ─────────────────────────────────────────────────────────

  describe("applyFilters", () => {
    it("returns all rooms when no filters are set", () => {
      const rooms = [makeRoom(), makeRoom({ room_id: "room-2" })];
      expect(service.applyFilters(rooms, {})).toHaveLength(2);
    });

    it("filters by roomType", () => {
      const rooms = [
        makeRoom({ room_type: "suite" }),
        makeRoom({ room_id: "r2", room_type: "standard" }),
      ];
      const result = service.applyFilters(rooms, { roomType: ["suite"] });
      expect(result).toHaveLength(1);
      expect(result[0].room_type).toBe("suite");
    });

    it("filters by bedType", () => {
      const rooms = [
        makeRoom({ bed_type: "king" }),
        makeRoom({ room_id: "r2", bed_type: "twin" }),
      ];
      expect(service.applyFilters(rooms, { bedType: ["king"] })).toHaveLength(
        1,
      );
    });

    it("filters by viewType", () => {
      const rooms = [
        makeRoom({ view_type: "ocean" }),
        makeRoom({ room_id: "r2", view_type: "city" }),
      ];
      expect(service.applyFilters(rooms, { viewType: ["city"] })).toHaveLength(
        1,
      );
    });

    it("filters by amenities (all required amenities must be present)", () => {
      const rooms = [
        makeRoom({ amenities: ["wifi", "pool", "gym"] }),
        makeRoom({ room_id: "r2", amenities: ["wifi"] }),
      ];
      expect(
        service.applyFilters(rooms, { amenities: ["wifi", "pool"] }),
      ).toHaveLength(1);
    });

    it("filters by stars (multi-value)", () => {
      const rooms = [
        makeRoom({ stars: 5 }),
        makeRoom({ room_id: "r2", stars: 3 }),
        makeRoom({ room_id: "r3", stars: 4 }),
      ];
      const result = service.applyFilters(rooms, { stars: [4, 5] });
      expect(result).toHaveLength(2);
    });

    it("filters by priceMin using avail_price_usd when present", () => {
      const rooms = [
        makeRoom({ avail_price_usd: "80.00", base_price_usd: "200.00" }),
        makeRoom({ room_id: "r2", avail_price_usd: "120.00" }),
      ];
      const result = service.applyFilters(rooms, { priceMin: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].avail_price_usd).toBe("120.00");
    });

    it("falls back to base_price_usd when avail_price_usd is null", () => {
      const rooms = [
        makeRoom({ avail_price_usd: null, base_price_usd: "50.00" }),
        makeRoom({
          room_id: "r2",
          avail_price_usd: null,
          base_price_usd: "200.00",
        }),
      ];
      const result = service.applyFilters(rooms, { priceMax: 100 });
      expect(result).toHaveLength(1);
      expect(result[0].base_price_usd).toBe("50.00");
    });

    it("applies multiple filters simultaneously", () => {
      const rooms = [
        makeRoom({ room_type: "suite", stars: 5, amenities: ["wifi", "pool"] }),
        makeRoom({
          room_id: "r2",
          room_type: "standard",
          stars: 5,
          amenities: ["wifi", "pool"],
        }),
        makeRoom({
          room_id: "r3",
          room_type: "suite",
          stars: 3,
          amenities: ["wifi", "pool"],
        }),
      ];
      const result = service.applyFilters(rooms, {
        roomType: ["suite"],
        stars: [5],
      });
      expect(result).toHaveLength(1);
    });
  });

  // ─── computeFacets (retain other selections) ─────────────────────────────

  describe("computeFacets", () => {
    const candidates: CandidateRoom[] = [
      makeRoom({
        room_id: "r1",
        property_id: "p1",
        room_type: "suite",
        bed_type: "king",
        view_type: "ocean",
        stars: 5,
        amenities: ["wifi", "pool"],
      }),
      makeRoom({
        room_id: "r2",
        property_id: "p2",
        room_type: "standard",
        bed_type: "twin",
        view_type: "city",
        stars: 3,
        amenities: ["wifi"],
      }),
      makeRoom({
        room_id: "r3",
        property_id: "p3",
        room_type: "deluxe",
        bed_type: "queen",
        view_type: "garden",
        stars: 4,
        amenities: ["wifi", "gym"],
      }),
    ];

    it("roomTypes facet counts all room types when no roomType filter active", () => {
      const facets = service.computeFacets(candidates, makeDto());
      const types = facets.roomTypes.map((f) => f.id);
      expect(types).toContain("suite");
      expect(types).toContain("standard");
      expect(types).toContain("deluxe");
    });

    it("roomTypes facet is NOT filtered by the active roomType selection", () => {
      const dto = makeDto({ roomType: ["suite"] });
      const facets = service.computeFacets(candidates, dto);
      const types = facets.roomTypes.map((f) => f.id);
      expect(types).toContain("standard");
      expect(types).toContain("deluxe");
    });

    it("roomTypes facet IS affected by other active filters (bedType)", () => {
      const dto = makeDto({ bedType: ["king"] });
      const facets = service.computeFacets(candidates, dto);
      const types = facets.roomTypes.map((f) => f.id);
      expect(types).toContain("suite");
      expect(types).not.toContain("standard");
      expect(types).not.toContain("deluxe");
    });

    it("bedTypes facet is NOT filtered by active bedType selection", () => {
      const dto = makeDto({ bedType: ["king"] });
      const facets = service.computeFacets(candidates, dto);
      const beds = facets.bedTypes.map((f) => f.id);
      expect(beds).toContain("twin");
      expect(beds).toContain("queen");
    });

    it("amenities facet excludes active amenities filter but NOT other filters", () => {
      const dto = makeDto({ amenities: ["pool"], stars: [4, 5] });
      const facets = service.computeFacets(candidates, dto);
      const amenityIds = facets.amenities.map((f) => f.id);
      expect(amenityIds).toContain("wifi");
      expect(amenityIds).toContain("pool");
      expect(amenityIds).toContain("gym");
    });

    it("stars facet counts distinct properties per star rating", () => {
      const facets = service.computeFacets(candidates, makeDto());
      const stars5 = facets.stars.find((f) => f.id === 5);
      const stars3 = facets.stars.find((f) => f.id === 3);
      expect(stars5?.count).toBe(1);
      expect(stars3?.count).toBe(1);
    });

    it("counts properties, not rooms, per facet value", () => {
      const candidatesShared: CandidateRoom[] = [
        makeRoom({ room_id: "r1", property_id: "p1", room_type: "suite" }),
        makeRoom({ room_id: "r2", property_id: "p1", room_type: "suite" }),
        makeRoom({ room_id: "r3", property_id: "p2", room_type: "suite" }),
      ];
      const facets = service.computeFacets(candidatesShared, makeDto());
      const suiteCount = facets.roomTypes.find((f) => f.id === "suite")?.count;
      expect(suiteCount).toBe(2);
    });
  });

  // ─── selectBestRoomPerProperty ────────────────────────────────────────────

  describe("selectBestRoomPerProperty", () => {
    it("returns one result per property", () => {
      const rooms = [
        makeRoom({ room_id: "r1", property_id: "p1", base_price_usd: "100" }),
        makeRoom({ room_id: "r2", property_id: "p1", base_price_usd: "80" }),
        makeRoom({ room_id: "r3", property_id: "p2", base_price_usd: "200" }),
      ];
      expect(service.selectBestRoomPerProperty(rooms)).toHaveLength(2);
    });

    it("selects the cheapest room per property by base_price_usd", () => {
      const rooms = [
        makeRoom({ room_id: "r1", property_id: "p1", base_price_usd: "200" }),
        makeRoom({ room_id: "r2", property_id: "p1", base_price_usd: "80" }),
      ];
      const result = service.selectBestRoomPerProperty(rooms);
      expect(result[0].bestRoom.roomId).toBe("r2");
    });

    it("prefers avail_price_usd over base_price_usd for sorting", () => {
      const rooms = [
        makeRoom({
          room_id: "r1",
          property_id: "p1",
          base_price_usd: "50",
          avail_price_usd: "300",
        }),
        makeRoom({
          room_id: "r2",
          property_id: "p1",
          base_price_usd: "200",
          avail_price_usd: "100",
        }),
      ];
      const result = service.selectBestRoomPerProperty(rooms);
      expect(result[0].bestRoom.roomId).toBe("r2");
    });

    it("exposes priceUsd as null when no availability", () => {
      const rooms = [makeRoom({ avail_price_usd: null })];
      const result = service.selectBestRoomPerProperty(rooms);
      expect(result[0].bestRoom.priceUsd).toBeNull();
    });

    it("unions amenities across all rooms of a property", () => {
      const rooms = [
        makeRoom({
          room_id: "r1",
          property_id: "p1",
          amenities: ["wifi", "pool"],
        }),
        makeRoom({
          room_id: "r2",
          property_id: "p1",
          amenities: ["gym", "spa"],
        }),
      ];
      const result = service.selectBestRoomPerProperty(rooms);
      expect(result[0].amenities).toEqual(
        expect.arrayContaining(["wifi", "pool", "gym", "spa"]),
      );
    });
  });

  // ─── sortProperties ───────────────────────────────────────────────────────

  describe("sortProperties", () => {
    const makeProperty = (
      id: string,
      price: number,
      stars: number,
      rating: number,
    ): ReturnType<FacetsService["selectBestRoomPerProperty"]>[0] => ({
      id: id,
      name: `Hotel ${id}`,
      city: "Lisbon",
      countryCode: "PT",
      neighborhood: null,
      stars,
      rating,
      reviewCount: 10,
      thumbnailUrl: "",
      amenities: [],
      bestRoom: {
        roomId: `room-${id}`,
        roomType: "suite",
        bedType: "king",
        capacity: 2,
        basePriceUsd: price,
        priceUsd: price,
        taxRatePct: 0,
        estimatedTotalUsd: price,
        hasFlatFees: false,
      },
    });

    it("sorts by price_asc", () => {
      const props = [
        makeProperty("p1", 200, 4, 4.0),
        makeProperty("p2", 100, 3, 3.5),
      ];
      const sorted = service.sortProperties(props, "price_asc");
      expect(sorted[0].id).toBe("p2");
    });

    it("sorts by price_desc", () => {
      const props = [
        makeProperty("p1", 100, 4, 4.0),
        makeProperty("p2", 200, 3, 3.5),
      ];
      const sorted = service.sortProperties(props, "price_desc");
      expect(sorted[0].id).toBe("p2");
    });

    it("sorts by stars_desc, then rating desc as tiebreaker", () => {
      const props = [
        makeProperty("p1", 100, 4, 3.5),
        makeProperty("p2", 200, 4, 4.5),
        makeProperty("p3", 150, 5, 3.0),
      ];
      const sorted = service.sortProperties(props, "stars_desc");
      expect(sorted[0].id).toBe("p3");
      expect(sorted[1].id).toBe("p2");
      expect(sorted[2].id).toBe("p1");
    });

    it("does not mutate the original array", () => {
      const props = [
        makeProperty("p1", 200, 4, 4.0),
        makeProperty("p2", 100, 4, 4.0),
      ];
      const original = [...props];
      service.sortProperties(props, "price_asc");
      expect(props[0].id).toBe(original[0].id);
    });
  });

  // ─── priceRange facet ─────────────────────────────────────────────────────

  describe("priceRange in computeFacets", () => {
    it("returns min/max from avail_price_usd when available", () => {
      const candidates: CandidateRoom[] = [
        makeRoom({
          room_id: "r1",
          property_id: "p1",
          avail_price_usd: "100.00",
          base_price_usd: "200.00",
        }),
        makeRoom({
          room_id: "r2",
          property_id: "p2",
          avail_price_usd: "300.00",
          base_price_usd: "50.00",
        }),
      ];
      const facets = service.computeFacets(candidates, makeDto());
      expect(facets.priceRange.min).toBe(100);
      expect(facets.priceRange.max).toBe(300);
    });

    it("returns 0/0 when no candidates", () => {
      const facets = service.computeFacets([], makeDto());
      expect(facets.priceRange.min).toBe(0);
      expect(facets.priceRange.max).toBe(0);
    });

    it("currency is always USD", () => {
      const facets = service.computeFacets([makeRoom()], makeDto());
      expect(facets.priceRange.currency).toBe("USD");
    });
  });
});
