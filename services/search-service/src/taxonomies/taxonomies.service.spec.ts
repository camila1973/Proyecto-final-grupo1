import { TaxonomiesService } from "./taxonomies.service.js";
import type { TaxonomiesRepository } from "./taxonomies.repository.js";
import type { CacheService } from "../cache/cache.service.js";

const CACHE_KEY = "search:taxonomies";

const fakeCategories = [
  {
    id: "cat1",
    code: "room_type",
    label: "Room Type",
    filter_type: "checkbox",
    display_order: 1,
    is_active: true,
    created_at: "",
  },
];

const fakeValues = [
  {
    id: "val1",
    category_id: "cat1",
    code: "suite",
    label: "Suite",
    display_order: 1,
    is_active: true,
    created_at: "",
  },
  {
    id: "val2",
    category_id: "cat1",
    code: "standard",
    label: "Standard",
    display_order: 2,
    is_active: true,
    created_at: "",
  },
];

describe("TaxonomiesService", () => {
  let service: TaxonomiesService;
  let cache: jest.Mocked<Pick<CacheService, "get" | "set" | "del">>;
  let repo: jest.Mocked<
    Pick<TaxonomiesRepository, "findActiveCategories" | "findActiveValues">
  >;

  beforeEach(() => {
    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    repo = {
      findActiveCategories: jest.fn().mockResolvedValue(fakeCategories),
      findActiveValues: jest.fn().mockResolvedValue(fakeValues),
    };

    service = new TaxonomiesService(
      repo as unknown as TaxonomiesRepository,
      cache as unknown as CacheService,
    );
  });

  describe("getTaxonomies", () => {
    it("returns parsed cache value on cache hit without querying DB", async () => {
      const cached = { categories: [] };
      cache.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getTaxonomies();

      expect(result).toEqual(cached);
      expect(repo.findActiveCategories).not.toHaveBeenCalled();
    });

    it("queries repo on cache miss and returns camelCase response", async () => {
      const result = (await service.getTaxonomies()) as any;

      expect(result.categories).toHaveLength(1);
      const cat = result.categories[0];
      expect(cat.filterType).toBe("checkbox");
      expect(cat.displayOrder).toBe(1);
      expect(cat.values).toHaveLength(2);
      expect(cat.values[0]).toEqual({
        id: "val1",
        code: "suite",
        label: "Suite",
        displayOrder: 1,
      });
    });

    it("groups values by category", async () => {
      const result = (await service.getTaxonomies()) as any;
      expect(result.categories[0].values).toHaveLength(2);
    });

    it("stores result in cache after repo query", async () => {
      await service.getTaxonomies();
      expect(cache.set).toHaveBeenCalledWith(
        CACHE_KEY,
        expect.any(String),
        60 * 60 * 24,
      );
    });

    it("returns empty values array for category with no matching values", async () => {
      repo.findActiveValues.mockResolvedValue([]);
      const result = (await service.getTaxonomies()) as any;
      expect(result.categories[0].values).toEqual([]);
    });
  });

  describe("invalidateCache", () => {
    it("calls cache.del with the correct key", async () => {
      await service.invalidateCache();
      expect(cache.del).toHaveBeenCalledWith(CACHE_KEY);
    });
  });
});
