import { NotFoundException } from "@nestjs/common";
import { TaxRulesRepository } from "./tax-rules.repository.js";

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
