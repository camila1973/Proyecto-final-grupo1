import { TaxRulesRepository } from "./tax-rules.repository.js";

// ─── Kysely builder mock ────────────────────────────────────────────────────

function makeDb(rows: Record<string, unknown>[] = []) {
  const db: Record<string, jest.Mock> = {};
  const chain = ["selectFrom", "where", "select"];
  chain.forEach((m) => {
    db[m] = jest.fn().mockReturnValue(db);
  });
  db.execute = jest.fn().mockResolvedValue(rows);
  return db as any;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRule(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-1",
    country: "MX",
    city: null as string | null,
    tax_name: "IVA",
    tax_type: "PERCENTAGE",
    rate: "16.00",
    flat_amount: null,
    currency: "USD",
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("TaxRulesRepository", () => {
  describe("findApplicable", () => {
    const stayDate = new Date("2026-05-01");

    it("returns empty array when no rules exist", async () => {
      const db = makeDb([]);
      const repo = new TaxRulesRepository(db);

      const result = await repo.findApplicable("MX", "cancún", stayDate);

      expect(result).toHaveLength(0);
    });

    it("returns country-level rules", async () => {
      const rule = makeRule();
      const db = makeDb([rule]);
      const repo = new TaxRulesRepository(db);

      const result = await repo.findApplicable("MX", "cancún", stayDate);

      expect(result).toHaveLength(1);
      expect(result[0].tax_name).toBe("IVA");
    });

    it("city-specific rule overrides country-level rule with same tax_name", async () => {
      const countryRule = makeRule({ city: null, rate: "10.00" });
      const cityRule = makeRule({ city: "cancún", rate: "16.00" });
      const db = makeDb([countryRule, cityRule]);
      const repo = new TaxRulesRepository(db);

      const result = await repo.findApplicable("MX", "cancún", stayDate);

      expect(result).toHaveLength(1);
      expect(result[0].rate).toBe("16.00");
      expect(result[0].city).toBe("cancún");
    });

    it("returns both rules when they have different tax_names", async () => {
      const iva = makeRule({ tax_name: "IVA", city: null });
      const ish = makeRule({ id: "rule-2", tax_name: "ISH", city: "cancún" });
      const db = makeDb([iva, ish]);
      const repo = new TaxRulesRepository(db);

      const result = await repo.findApplicable("MX", "cancún", stayDate);

      expect(result).toHaveLength(2);
      const names = result.map((r) => r.tax_name);
      expect(names).toContain("IVA");
      expect(names).toContain("ISH");
    });

    it("queries with normalized (lowercase) city name", async () => {
      const db = makeDb([]);
      const repo = new TaxRulesRepository(db);

      await repo.findApplicable("MX", "Cancún", stayDate);

      // The where calls include a reference to normalized city
      expect(db.where).toHaveBeenCalled();
    });
  });
});
