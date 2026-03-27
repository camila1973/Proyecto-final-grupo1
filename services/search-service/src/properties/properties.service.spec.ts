import { PropertiesService } from "./properties.service.js";
import type { DatabaseService } from "../database/database.service.js";
import type { CacheService } from "../cache/cache.service.js";
import type { FacetsService } from "./facets/facets.service.js";
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

const mockProperty = {
  propertyId: "p1",
  propertyName: "Hotel A",
  city: "Lisbon",
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

function makeQueryChain(rows: unknown[]) {
  const chain: Record<string, jest.Mock> = {} as any;

  chain.select = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.$if = jest
    .fn()
    .mockImplementation((cond: boolean, fn: (qb: any) => any) => {
      if (cond) fn(chain);
      return chain;
    });
  chain.execute = jest.fn().mockResolvedValue(rows);
  return chain;
}

function makeServices(rows = [mockRoom]) {
  const queryChain = makeQueryChain(rows);
  const db = {
    db: { selectFrom: jest.fn().mockReturnValue(queryChain) },
  } as unknown as DatabaseService;

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

  const service = new PropertiesService(
    db,
    cache as unknown as CacheService,
    mockFacets,
  );
  return { service, db, cache, mockFacets, queryChain };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("PropertiesService", () => {
  describe("searchProperties — cache hit", () => {
    it("returns cached response without querying the DB", async () => {
      const { service, cache, db } = makeServices();
      const cached = { meta: { total: 0 }, results: [], facets: {} };
      (cache.get as jest.Mock).mockResolvedValue(JSON.stringify(cached));

      const result = await service.searchProperties(baseDto);

      expect(result).toEqual(cached);
      expect(db.db.selectFrom).not.toHaveBeenCalled();
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

  describe("fetchCandidates conditional clauses", () => {
    // City filter is the first $if call; date (booked-ranges) filter is the second.

    it("uses $if with hasCity=true when city is provided", async () => {
      const { service, queryChain } = makeServices();
      await service.searchProperties({ ...baseDto, city: "Lisbon" });
      const ifCalls = queryChain.$if.mock.calls;
      expect(ifCalls[0][0]).toBe(true);
    });

    it("uses $if with hasCity=false when city is empty", async () => {
      const { service, queryChain } = makeServices();
      await service.searchProperties({ ...baseDto, city: "" });
      const ifCalls = queryChain.$if.mock.calls;
      expect(ifCalls[0][0]).toBe(false);
    });

    it("applies NOT EXISTS booked-ranges filter when hasDates=true", async () => {
      const { service, queryChain } = makeServices();
      await service.searchProperties({
        ...baseDto,
        checkIn: "2026-04-01",
        checkOut: "2026-04-05",
      });
      const ifCalls = queryChain.$if.mock.calls;
      // second $if call is the hasDates branch
      expect(ifCalls[1][0]).toBe(true);
    });

    it("skips booked-ranges filter when no dates provided", async () => {
      const { service, queryChain } = makeServices();
      await service.searchProperties(
        Object.fromEntries(
          Object.entries(baseDto).filter(
            ([k]) => k !== "checkIn" && k !== "checkOut",
          ),
        ) as SearchPropertiesDto,
      );
      const ifCalls = queryChain.$if.mock.calls;
      expect(ifCalls[1][0]).toBe(false);
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
    const mockDetailRow = {
      ...mockRoom,
      neighborhood: "Centro",
      lat: 38.7,
      lon: -9.14,
    };

    function makeDetailQueryChain(rows: unknown[]) {
      const chain: Record<string, jest.Mock> = {} as any;
      chain.select = jest.fn().mockReturnValue(chain);
      chain.where = jest.fn().mockReturnValue(chain);
      chain.execute = jest.fn().mockResolvedValue(rows);
      return chain;
    }

    function makeDetailServices(rows = [mockDetailRow]) {
      const queryChain = makeDetailQueryChain(rows);
      const db = {
        db: { selectFrom: jest.fn().mockReturnValue(queryChain) },
      } as unknown as DatabaseService;
      const cache: jest.Mocked<Pick<CacheService, "get" | "set" | "scanDel">> =
        {
          get: jest.fn().mockResolvedValue(null),
          set: jest.fn().mockResolvedValue(undefined),
          scanDel: jest.fn().mockResolvedValue(undefined),
        };
      const mockFacets = {
        applyFilters: jest.fn(),
        computeFacets: jest.fn(),
        selectBestRoomPerProperty: jest.fn(),
        sortProperties: jest.fn(),
      } as any;
      const service = new PropertiesService(
        db,
        cache as unknown as CacheService,
        mockFacets,
      );
      return { service, cache, db };
    }

    it("returns null when no rows found", async () => {
      const { service } = makeDetailServices([]);
      const result = await service.getPropertyById("unknown");
      expect(result).toBeNull();
    });

    it("returns property detail with rooms when rows found", async () => {
      const { service } = makeDetailServices();
      const result = (await service.getPropertyById("p1")) as any;
      expect(result).not.toBeNull();
      expect(result.propertyId).toBe("p1");
      expect(result.propertyName).toBe("Hotel A");
      expect(result.rooms).toHaveLength(1);
      expect(result.rooms[0].roomId).toBe("r1");
    });

    it("deduplicates amenities across rooms", async () => {
      const rows = [
        { ...mockDetailRow, amenities: ["wifi", "pool"] },
        { ...mockDetailRow, room_id: "r2", amenities: ["wifi", "spa"] },
      ];
      const { service } = makeDetailServices(rows);
      const result = (await service.getPropertyById("p1")) as any;
      expect(result.amenities).toContain("wifi");
      expect(result.amenities.filter((a: string) => a === "wifi")).toHaveLength(
        1,
      );
    });

    it("returns cached response on cache hit", async () => {
      const { service, cache, db } = makeDetailServices();
      const cached = { propertyId: "p1", cached: true };
      (cache.get as jest.Mock).mockResolvedValue(JSON.stringify(cached));
      const result = await service.getPropertyById("p1");
      expect(result).toEqual(cached);
      expect(db.db.selectFrom).not.toHaveBeenCalled();
    });

    it("stores response in cache with 5-minute TTL", async () => {
      const { service, cache } = makeDetailServices();
      await service.getPropertyById("p1");
      expect(cache.set).toHaveBeenCalledWith(
        "search:property:p1",
        expect.any(String),
        300,
      );
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
