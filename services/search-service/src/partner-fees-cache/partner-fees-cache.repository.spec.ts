import { PartnerFeesCacheRepository } from "./partner-fees-cache.repository.js";

function makeDb() {
  const chain: Record<string, jest.Mock> = {};
  const methods = [
    "selectFrom",
    "select",
    "where",
    "updateTable",
    "set",
    "deleteFrom",
  ];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnThis();
  }
  chain.execute = jest.fn().mockResolvedValue([]);
  return chain;
}

describe("PartnerFeesCacheRepository", () => {
  describe("softDelete", () => {
    it("calls updateTable to set is_active=false", async () => {
      const db = makeDb();
      db.execute.mockResolvedValue(undefined);
      const repo = new PartnerFeesCacheRepository(db as any);

      await repo.softDelete("fee-1");
      expect(db.updateTable).toHaveBeenCalledWith("partner_fees_cache");
      expect(db.set).toHaveBeenCalledWith({ is_active: false });
      expect(db.execute).toHaveBeenCalled();
    });
  });

  describe("getPartnersWithActiveFlatFees", () => {
    it("returns empty set for empty partnerIds", async () => {
      const db = makeDb();
      const repo = new PartnerFeesCacheRepository(db as any);
      const result = await repo.getPartnersWithActiveFlatFees([]);
      expect(result).toEqual(new Set());
    });

    it("returns set of partner_ids from rows", async () => {
      const db = makeDb();
      db.execute.mockResolvedValue([
        { partner_id: "p1" },
        { partner_id: "p2" },
      ]);
      const repo = new PartnerFeesCacheRepository(db as any);

      const result = await repo.getPartnersWithActiveFlatFees(["p1", "p2"]);
      expect(result).toEqual(new Set(["p1", "p2"]));
    });
  });

  describe("getFlatFeeTotals", () => {
    it("returns empty map for empty partnerIds", async () => {
      const db = makeDb();
      const repo = new PartnerFeesCacheRepository(db as any);
      const result = await repo.getFlatFeeTotals(
        [],
        "2026-05-01",
        "2026-05-04",
      );
      expect(result).toEqual(new Map());
    });

    it("returns empty map for 0 nights", async () => {
      const db = makeDb();
      const repo = new PartnerFeesCacheRepository(db as any);
      const result = await repo.getFlatFeeTotals(
        ["p1"],
        "2026-05-01",
        "2026-05-01",
      );
      expect(result).toEqual(new Map());
    });

    it("accumulates FLAT_PER_NIGHT fees across 3 nights", async () => {
      const db = makeDb();
      db.execute.mockResolvedValue([
        {
          partner_id: "p1",
          fee_type: "FLAT_PER_NIGHT",
          flat_amount: "10.00",
          currency: "USD",
        },
        {
          partner_id: "p1",
          fee_type: "FLAT_PER_STAY",
          flat_amount: "5.00",
          currency: "USD",
        },
      ]);
      const repo = new PartnerFeesCacheRepository(db as any);

      const result = await repo.getFlatFeeTotals(
        ["p1"],
        "2026-05-01",
        "2026-05-04",
      );
      // 10 * 3 nights + 5 flat = 35
      expect(result.get("p1")).toBe(35);
    });

    it("skips rows with null flat_amount", async () => {
      const db = makeDb();
      db.execute.mockResolvedValue([
        {
          partner_id: "p1",
          fee_type: "FLAT_PER_STAY",
          flat_amount: null,
          currency: "USD",
        },
      ]);
      const repo = new PartnerFeesCacheRepository(db as any);

      const result = await repo.getFlatFeeTotals(
        ["p1"],
        "2026-05-01",
        "2026-05-04",
      );
      expect(result.has("p1")).toBe(false);
    });
  });
});
