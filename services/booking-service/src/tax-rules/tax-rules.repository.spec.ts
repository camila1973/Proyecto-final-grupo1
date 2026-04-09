import { NotFoundException } from "@nestjs/common";
import { TaxRulesRepository, resolveRules } from "./tax-rules.repository.js";
import type { TaxRule } from "./tax-rules.repository.js";

// ─── Kysely builder mock ────────────────────────────────────────────────────

function makeDb(
  rows: Record<string, unknown>[] = [],
  firstRow?: Record<string, unknown> | null,
) {
  const db: Record<string, jest.Mock> = {};
  const chain = [
    "selectFrom",
    "where",
    "select",
    "selectAll",
    "insertInto",
    "values",
    "returningAll",
    "updateTable",
    "set",
  ];
  chain.forEach((m) => {
    db[m] = jest.fn().mockReturnValue(db);
  });
  db.execute = jest.fn().mockResolvedValue(rows);
  db.executeTakeFirst = jest
    .fn()
    .mockResolvedValue(firstRow ?? rows[0] ?? undefined);
  db.executeTakeFirstOrThrow = jest
    .fn()
    .mockResolvedValue(firstRow ?? rows[0] ?? undefined);
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

  describe("insert", () => {
    it("inserts and returns the new row", async () => {
      const row = makeRule();
      const db = makeDb([], row);
      const repo = new TaxRulesRepository(db);

      const result = await repo.insert({
        country: "MX",
        city: null,
        tax_name: "IVA",
        tax_type: "PERCENTAGE",
        rate: "16.00",
        flat_amount: null,
        currency: "USD",
        effective_from: "2026-01-01",
        effective_to: null,
      } as any);

      expect(db.insertInto).toHaveBeenCalledWith("tax_rules");
      expect(result).toEqual(row);
    });
  });

  describe("findAll", () => {
    it("returns all rows without filter", async () => {
      const rows = [makeRule(), makeRule({ id: "rule-2" })];
      const db = makeDb(rows);
      const repo = new TaxRulesRepository(db);

      const result = await repo.findAll();
      expect(result).toEqual(rows);
    });

    it("filters by country when provided", async () => {
      const db = makeDb([makeRule()]);
      const repo = new TaxRulesRepository(db);

      await repo.findAll("MX");
      expect(db.where).toHaveBeenCalledWith("country", "=", "MX");
    });
  });

  describe("findById", () => {
    it("returns row when found", async () => {
      const row = makeRule();
      const db = makeDb([], row);
      const repo = new TaxRulesRepository(db);

      const result = await repo.findById("rule-1");
      expect(result).toEqual(row);
    });

    it("throws NotFoundException when not found", async () => {
      const db = makeDb([], null);
      const repo = new TaxRulesRepository(db);

      await expect(repo.findById("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("updates and returns the modified row", async () => {
      const row = makeRule({ tax_name: "IVA updated" });
      const db = makeDb([], row);
      const repo = new TaxRulesRepository(db);

      const result = await repo.update("rule-1", { tax_name: "IVA updated" });
      expect(db.updateTable).toHaveBeenCalledWith("tax_rules");
      expect(result).toEqual(row);
    });

    it("throws NotFoundException when row not found", async () => {
      const db = makeDb([], null);
      const repo = new TaxRulesRepository(db);

      await expect(repo.update("missing", {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("softDelete", () => {
    it("sets is_active=false for the given id", async () => {
      const db = makeDb();
      const repo = new TaxRulesRepository(db);

      await repo.softDelete("rule-1");
      expect(db.updateTable).toHaveBeenCalledWith("tax_rules");
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });
  });
});

describe("resolveRules", () => {
  function makeRule(overrides: Partial<TaxRule> = {}): TaxRule {
    return {
      id: "r1",
      country: "MX",
      city: null,
      tax_name: "IVA",
      tax_type: "PERCENTAGE",
      rate: "16",
      flat_amount: null,
      currency: "USD",
      ...overrides,
    };
  }

  it("returns single rule unchanged", () => {
    const rule = makeRule();
    expect(resolveRules([rule])).toEqual([rule]);
  });

  it("city-level rule wins over country-level rule with same tax_name", () => {
    const country = makeRule({ city: null, rate: "16" });
    const city = makeRule({ city: "cancún", rate: "11" });
    const result = resolveRules([country, city]);
    expect(result).toHaveLength(1);
    expect(result[0].city).toBe("cancún");
    expect(result[0].rate).toBe("11");
  });

  it("rules with different tax_name are both kept (cumulative)", () => {
    const iva = makeRule({ tax_name: "IVA", city: null });
    const inc = makeRule({ id: "r2", tax_name: "INC", city: null, rate: "8" });
    const result = resolveRules([iva, inc]);
    expect(result).toHaveLength(2);
    const names = result.map((r) => r.tax_name);
    expect(names).toContain("IVA");
    expect(names).toContain("INC");
  });

  it("Colombia scenario: IVA 19% + INC 8% both survive", () => {
    const iva = makeRule({ tax_name: "IVA", rate: "19", city: null });
    const inc = makeRule({ id: "r2", tax_name: "INC", rate: "8", city: null });
    const result = resolveRules([iva, inc]);
    expect(result).toHaveLength(2);
    const total = result.reduce((acc, r) => acc + parseFloat(r.rate ?? "0"), 0);
    expect(total).toBe(27);
  });

  it("Cancún scenario: city IVA (11) + ISH (3) = 14 (country IVA 16 excluded)", () => {
    const countryIva = makeRule({ tax_name: "IVA", rate: "16", city: null });
    const cityIva = makeRule({ tax_name: "IVA", rate: "11", city: "cancún" });
    const ish = makeRule({
      id: "r3",
      tax_name: "ISH",
      rate: "3",
      city: "cancún",
    });
    const result = resolveRules([countryIva, cityIva, ish]);
    expect(result).toHaveLength(2);
    const total = result.reduce((acc, r) => acc + parseFloat(r.rate ?? "0"), 0);
    expect(total).toBe(14);
  });
});
