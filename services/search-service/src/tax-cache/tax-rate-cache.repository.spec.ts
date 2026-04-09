import { TaxRateCacheRepository } from "./tax-rate-cache.repository.js";

function makeDb() {
  const chainMethods = [
    "selectFrom",
    "select",
    "where",
    "deleteFrom",
    "updateTable",
    "set",
  ];
  const chain: Record<string, jest.Mock> = {};
  for (const m of chainMethods) {
    chain[m] = jest.fn().mockReturnThis();
  }
  chain.executeTakeFirst = jest.fn();
  chain.execute = jest.fn();
  return chain;
}

describe("TaxRateCacheRepository", () => {
  describe("lookup", () => {
    it("returns parsed total_pct for city-specific row", async () => {
      const db = makeDb();
      db.executeTakeFirst.mockResolvedValue({ total_pct: "16.00" });
      const repo = new TaxRateCacheRepository(db as any);

      const result = await repo.lookup("MX", "cancún");
      expect(result).toBe(16);
    });

    it("falls back to country-level when city row missing", async () => {
      const db = makeDb();
      db.executeTakeFirst
        .mockResolvedValueOnce(undefined) // city query
        .mockResolvedValueOnce({ total_pct: "8.00" }); // country query
      const repo = new TaxRateCacheRepository(db as any);

      const result = await repo.lookup("MX", "cancún");
      expect(result).toBe(8);
    });

    it("returns 0 when no rows found", async () => {
      const db = makeDb();
      db.executeTakeFirst.mockResolvedValue(undefined);
      const repo = new TaxRateCacheRepository(db as any);

      const result = await repo.lookup("US", "");
      expect(result).toBe(0);
    });
  });

  describe("delete", () => {
    it("deletes row for country and city", async () => {
      const db = makeDb();
      db.execute.mockResolvedValue(undefined);
      const repo = new TaxRateCacheRepository(db as any);

      await repo.delete("MX", "cancún");
      expect(db.deleteFrom).toHaveBeenCalledWith("tax_rate_cache");
      expect(db.execute).toHaveBeenCalled();
    });
  });

  describe("bulkUpdateRoomSearchIndex", () => {
    it("calls updateTable on room_search_index", async () => {
      const db = makeDb();
      db.execute.mockResolvedValue(undefined);
      const repo = new TaxRateCacheRepository(db as any);

      await repo.bulkUpdateRoomSearchIndex("MX", "cancún", 16);
      expect(db.updateTable).toHaveBeenCalledWith("room_search_index");
      expect(db.execute).toHaveBeenCalled();
    });
  });
});
