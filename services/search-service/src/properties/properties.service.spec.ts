import { PropertiesService } from "./properties.service.js";
import type { PropertiesRepository } from "./properties.repository.js";
import type { CacheService } from "../cache/cache.service.js";
import type { FacetsService } from "./facets/facets.service.js";
import type { InventoryClientService } from "../inventory/inventory-client.service.js";
import type { SearchPropertiesDto } from "./dto/search-properties.dto.js";

// ─── fixtures ─────────────────────────────────────────────────────────────────

const mockRoom = {
  room_id: "r1",
  property_id: "p1",
  property_name: "Hotel A",
  city: "Lisbon",
  country: "Portugal",
  stars: 4,
  rating: "4.0",
  review_count: 10,
  thumbnail_url: "",
  amenities: ["wifi"],
  room_type: "suite",
  bed_type: "king",
  view_type: "ocean",
  capacity: 2,
  base_price_usd: "200",
  avail_price_usd: "180",
};

const mockDetailRow = {
  ...mockRoom,
  neighborhood: "Centro",
  lat: 38.7,
  lon: -9.14,
};

const mockProperty = {
  propertyId: "p1",
  propertyName: "Hotel A",
  city: "Lisbon",
  country: "PT",
  stars: 4,
  rating: 4.0,
  reviewCount: 10,
  thumbnailUrl: "",
  amenities: ["wifi"],
  bestRoom: {
    roomId: "r1",
    roomType: "suite",
    bedType: "king",
    capacity: 2,
    basePriceUsd: 200,
    priceUsd: 180,
  },
};

const baseDto: SearchPropertiesDto = {
  city: "Lisbon",
  checkIn: "2026-04-01",
  checkOut: "2026-04-05",
  guests: 2,
  page: 1,
  pageSize: 20,
  sort: "relevance",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeServices(
  candidateRows = [mockRoom],
  detailRows = [mockDetailRow],
) {
  const repo: jest.Mocked<
    Pick<PropertiesRepository, "findCandidates" | "findByPropertyId">
  > = {
    findCandidates: jest.fn().mockResolvedValue(candidateRows),
    findByPropertyId: jest.fn().mockResolvedValue(detailRows),
  };

  const cache: jest.Mocked<Pick<CacheService, "get" | "set" | "scanDel">> = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    scanDel: jest.fn().mockResolvedValue(undefined),
  };

  const mockFacets: jest.Mocked<FacetsService> = {
    applyFilters: jest.fn().mockReturnValue([mockRoom]),
    computeFacets: jest.fn().mockReturnValue({
      roomTypes: [],
      bedTypes: [],
      viewTypes: [],
      amenities: [],
      stars: [],
      priceRange: { min: 180, max: 180, currency: "USD" },
    }),
    selectBestRoomPerProperty: jest.fn().mockReturnValue([mockProperty]),
    sortProperties: jest.fn().mockReturnValue([mockProperty]),
  } as any;

  const inventoryClient: jest.Mocked<
    Pick<InventoryClientService, "checkAvailability">
  > = {
    checkAvailability: jest
      .fn()
      .mockResolvedValue(candidateRows.map((r) => ({ roomId: r.room_id }))),
  };

  const service = new PropertiesService(
    repo as unknown as PropertiesRepository,
    cache as unknown as CacheService,
    mockFacets,
    inventoryClient as unknown as InventoryClientService,
  );
  return { service, repo, cache, mockFacets, inventoryClient };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("PropertiesService", () => {
  describe("searchProperties — cache hit", () => {
    it("returns cached response without querying the DB", async () => {
      const { service, cache, repo } = makeServices();
      const cached = { meta: { total: 0 }, results: [], facets: {} };
      (cache.get as jest.Mock).mockResolvedValue(JSON.stringify(cached));

      const result = await service.searchProperties(baseDto);

      expect(result).toEqual(cached);
      expect(repo.findCandidates).not.toHaveBeenCalled();
    });
  });

  describe("searchProperties — cache miss", () => {
    it("returns meta with total, page, pageSize, totalPages, searchId", async () => {
      const { service } = makeServices();
      const result = (await service.searchProperties(baseDto)) as any;

      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(20);
      expect(result.meta.totalPages).toBe(1);
      expect(typeof result.meta.searchId).toBe("string");
    });

    it("returns the sorted properties as results", async () => {
      const { service } = makeServices();
      const result = (await service.searchProperties(baseDto)) as any;
      expect(result.results).toEqual([mockProperty]);
    });

    it("stores serialised response in cache with 5-minute TTL", async () => {
      const { service, cache } = makeServices();
      await service.searchProperties(baseDto);

      expect(cache.set).toHaveBeenCalledWith(
        expect.stringContaining("search:properties:lisbon:"),
        expect.any(String),
        300,
      );
    });

    it("delegates filter application to facets service", async () => {
      const { service, mockFacets } = makeServices();
      await service.searchProperties({
        ...baseDto,
        stars: [4, 5],
        priceMax: 400,
        exact: true,
      });
      expect(mockFacets.applyFilters).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ stars: [4, 5], priceMax: 400 }),
      );
    });

    it("passes only price filters to applyFilters when exact=false", async () => {
      const { service, mockFacets } = makeServices();
      await service.searchProperties({
        ...baseDto,
        roomType: ["suite"],
        stars: [5],
        exact: false,
      });
      expect(mockFacets.applyFilters).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ roomType: undefined, stars: undefined }),
      );
    });

    it("passes only price filters to applyFilters when exact is undefined", async () => {
      const { service, mockFacets } = makeServices();
      await service.searchProperties({ ...baseDto, roomType: ["suite"] });
      expect(mockFacets.applyFilters).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ roomType: undefined }),
      );
    });

    it("produces different cache keys for exact=true vs exact=false", async () => {
      const { service, cache } = makeServices();
      await service.searchProperties({ ...baseDto, exact: true });
      await service.searchProperties({ ...baseDto, exact: false });
      const keys = (cache.set as jest.Mock).mock.calls.map(
        (c) => c[0] as string,
      );
      expect(keys[0]).not.toBe(keys[1]);
    });

    it("computes facets from unfiltered candidates", async () => {
      const { service, mockFacets } = makeServices();
      await service.searchProperties(baseDto);
      expect(mockFacets.computeFacets).toHaveBeenCalled();
    });

    it("includes facets in the response", async () => {
      const { service } = makeServices();
      const result = (await service.searchProperties(baseDto)) as any;
      expect(result.facets).toBeDefined();
      expect(result.facets.priceRange.currency).toBe("USD");
    });
  });

  describe("inventory availability filtering", () => {
    it("calls inventoryClient with candidate room IDs and dates", async () => {
      const { service, inventoryClient } = makeServices();
      await service.searchProperties(baseDto);
      expect(inventoryClient.checkAvailability).toHaveBeenCalledWith({
        roomIds: [mockRoom.room_id],
        fromDate: baseDto.checkIn,
        toDate: baseDto.checkOut,
      });
    });

    it("skips inventory call when no dates are provided", async () => {
      const { service, inventoryClient } = makeServices();
      await service.searchProperties({
        ...baseDto,
        checkIn: undefined,
        checkOut: undefined,
      });
      expect(inventoryClient.checkAvailability).not.toHaveBeenCalled();
    });

    it("skips inventory call when candidate list is empty", async () => {
      const { service, inventoryClient } = makeServices([]);
      await service.searchProperties(baseDto);
      expect(inventoryClient.checkAvailability).not.toHaveBeenCalled();
    });

    it("filters out rooms not returned by inventory", async () => {
      const roomA = { ...mockRoom, room_id: "rA" };
      const roomB = { ...mockRoom, room_id: "rB" };
      const { service, inventoryClient, mockFacets } = makeServices([
        roomA,
        roomB,
      ]);
      inventoryClient.checkAvailability.mockResolvedValue([{ roomId: "rA" }]);

      await service.searchProperties(baseDto);

      expect(mockFacets.applyFilters).toHaveBeenCalledWith(
        [roomA],
        expect.anything(),
      );
    });
  });

  describe("pagination", () => {
    it("slices results according to page and pageSize", async () => {
      const { service, mockFacets } = makeServices();
      const props = Array.from({ length: 7 }, (_, i) => ({
        ...mockProperty,
        propertyId: `p${i}`,
      }));
      mockFacets.sortProperties.mockReturnValue(props);

      const result = (await service.searchProperties({
        ...baseDto,
        page: 2,
        pageSize: 3,
      })) as any;

      expect(result.results).toHaveLength(3);
      expect(result.results[0].propertyId).toBe("p3");
      expect(result.meta.total).toBe(7);
      expect(result.meta.totalPages).toBe(3);
    });

    it("returns empty results for a page beyond total", async () => {
      const { service, mockFacets } = makeServices();
      mockFacets.sortProperties.mockReturnValue([mockProperty]);

      const result = (await service.searchProperties({
        ...baseDto,
        page: 5,
        pageSize: 20,
      })) as any;
      expect(result.results).toHaveLength(0);
    });
  });

  describe("invalidateCityCache", () => {
    it("calls scanDel with normalised city pattern", async () => {
      const { service, cache } = makeServices();
      await service.invalidateCityCache("New York");
      expect(cache.scanDel).toHaveBeenCalledWith(
        "search:properties:new_york:*",
      );
    });

    it("normalises city to lowercase with underscores", async () => {
      const { service, cache } = makeServices();
      await service.invalidateCityCache("São Paulo");
      expect(cache.scanDel).toHaveBeenCalledWith(
        expect.stringMatching(/^search:properties:.*:/),
      );
    });
  });

  describe("getPropertyById", () => {
    it("returns null when no rows found", async () => {
      const { service, repo } = makeServices([mockRoom], []);
      repo.findByPropertyId.mockResolvedValue([]);
      const result = await service.getPropertyById("unknown");
      expect(result).toBeNull();
    });

    it("returns property detail with rooms when rows found", async () => {
      const { service } = makeServices();
      const result = (await service.getPropertyById("p1")) as any;
      expect(result).not.toBeNull();
      expect(result.propertyId).toBe("p1");
      expect(result.propertyName).toBe("Hotel A");
      expect(result.rooms).toHaveLength(1);
      expect(result.rooms[0].roomId).toBe("r1");
    });

    it("deduplicates amenities across rooms", async () => {
      const { service, repo } = makeServices();
      repo.findByPropertyId.mockResolvedValue([
        { ...mockDetailRow, amenities: ["wifi", "pool"] },
        { ...mockDetailRow, room_id: "r2", amenities: ["wifi", "spa"] },
      ] as any);
      const result = (await service.getPropertyById("p1")) as any;
      expect(result.amenities).toContain("wifi");
      expect(result.amenities.filter((a: string) => a === "wifi")).toHaveLength(
        1,
      );
    });

    it("returns cached response on cache hit", async () => {
      const { service, cache, repo } = makeServices();
      const cached = { propertyId: "p1", cached: true };
      (cache.get as jest.Mock).mockResolvedValue(JSON.stringify(cached));
      const result = await service.getPropertyById("p1");
      expect(result).toEqual(cached);
      expect(repo.findByPropertyId).not.toHaveBeenCalled();
    });

    it("stores response in cache with 5-minute TTL", async () => {
      const { service, cache } = makeServices();
      await service.getPropertyById("p1");
      expect(cache.set).toHaveBeenCalledWith(
        "search:property:p1",
        expect.any(String),
        300,
      );
    });
  });

  describe("getCitySuggestions", () => {
    it("returns suggestions whose names start with the query (case-insensitive, accent-folded)", () => {
      const { service } = makeServices();
      const result = service.getCitySuggestions("can");
      expect(result.suggestions.length).toBeGreaterThan(0);
      const stripAccents = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      for (const s of result.suggestions) {
        expect(stripAccents(s.city.toLowerCase())).toMatch(/^can/);
      }
    });

    it("respects the limit parameter", () => {
      const { service } = makeServices();
      const result = service.getCitySuggestions("a", 3);
      expect(result.suggestions.length).toBeLessThanOrEqual(3);
    });

    it("returns empty suggestions for a query with no matches", () => {
      const { service } = makeServices();
      const result = service.getCitySuggestions("zzzzzzzzz");
      expect(result.suggestions).toEqual([]);
    });

    it("matches accented city names when querying without accents", () => {
      const { service } = makeServices();
      const result = service.getCitySuggestions("Cancun");
      const cities = result.suggestions.map((s) => s.city);
      expect(cities).toContain("Cancún");
    });

    it("matches non-accented city names when querying with accents", () => {
      const { service } = makeServices();
      const result = service.getCitySuggestions("Cancún");
      const cities = result.suggestions.map((s) => s.city);
      expect(cities.length).toBeGreaterThan(0);
    });

    it("returns city and country fields for each suggestion", () => {
      const { service } = makeServices();
      const result = service.getCitySuggestions("Paris");
      for (const s of result.suggestions) {
        expect(typeof s.city).toBe("string");
        expect(typeof s.country).toBe("string");
      }
    });
  });

  describe("cache key determinism", () => {
    it("generates same cache key for equivalent DTOs regardless of array order", async () => {
      const { service, cache } = makeServices();

      await service.searchProperties({ ...baseDto, stars: [5, 4] });
      const key1 = (cache.set as jest.Mock).mock.calls[0][0] as string;

      (cache.get as jest.Mock).mockResolvedValue(null);
      (cache.set as jest.Mock).mockClear();

      await service.searchProperties({ ...baseDto, stars: [4, 5] });
      const key2 = (cache.set as jest.Mock).mock.calls[0][0] as string;

      expect(key1).toBe(key2);
    });
  });
});
