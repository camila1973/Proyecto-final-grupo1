import { PropertiesRepository } from "./properties.repository";
import type { Kysely } from "kysely";
import type { Database } from "../database/database.types";

const NOW = new Date("2026-01-01T00:00:00Z");

const PROPERTY_ROW = {
  id: "prop-1",
  name: "Hotel Sol",
  type: "hotel",
  city: "Cancún",
  stars: 4,
  status: "active",
  country_code: "MX",
  partner_id: "partner-1",
  created_at: NOW,
  updated_at: NOW,
};

function makeChain(
  resolved: {
    execute?: any;
    executeTakeFirst?: any;
    executeTakeFirstOrThrow?: any;
  } = {},
) {
  const chain: Record<string, any> = {};
  const ret = () => jest.fn().mockReturnValue(chain);
  for (const m of [
    "selectFrom",
    "insertInto",
    "updateTable",
    "selectAll",
    "where",
    "values",
    "returningAll",
    "set",
  ]) {
    chain[m] = ret();
  }
  chain["execute"] = jest.fn().mockResolvedValue(resolved.execute ?? []);
  chain["executeTakeFirst"] = jest
    .fn()
    .mockResolvedValue(resolved.executeTakeFirst ?? undefined);
  chain["executeTakeFirstOrThrow"] = jest
    .fn()
    .mockResolvedValue(resolved.executeTakeFirstOrThrow ?? undefined);
  return chain as unknown as Kysely<Database>;
}

function makeRepo(db: Kysely<Database>) {
  const repo = new PropertiesRepository(db as any);
  return repo;
}

describe("PropertiesRepository", () => {
  describe("create", () => {
    it("inserts and returns the new property", async () => {
      const db = makeChain({ executeTakeFirstOrThrow: PROPERTY_ROW });
      const repo = makeRepo(db);
      const result = await repo.create({
        name: "Hotel Sol",
        type: "hotel",
        city: "Cancún",
        stars: 4,
        country_code: "MX",
        partner_id: "partner-1",
      });
      expect(result.id).toBe("prop-1");
      expect((db as any).insertInto).toHaveBeenCalledWith("inv_properties");
    });
  });

  describe("findAll", () => {
    it("queries by partnerId", async () => {
      const db = makeChain({ execute: [PROPERTY_ROW] });
      const repo = makeRepo(db);
      const result = await repo.findAll("partner-1", {});
      expect(result).toHaveLength(1);
    });

    it("applies city filter when provided", async () => {
      const db = makeChain({ execute: [PROPERTY_ROW] });
      const repo = makeRepo(db);
      await repo.findAll("partner-1", { city: "Cancún" });
      // where is called at least twice: once for partner_id, once for city
      expect((db as any).where).toHaveBeenCalledWith("city", "=", "Cancún");
    });

    it("applies status filter when provided", async () => {
      const db = makeChain({ execute: [PROPERTY_ROW] });
      const repo = makeRepo(db);
      await repo.findAll("partner-1", { status: "active" });
      expect((db as any).where).toHaveBeenCalledWith("status", "=", "active");
    });

    it("applies both filters when provided", async () => {
      const db = makeChain({ execute: [PROPERTY_ROW] });
      const repo = makeRepo(db);
      await repo.findAll("partner-1", { city: "Cancún", status: "active" });
      expect((db as any).where).toHaveBeenCalledWith("city", "=", "Cancún");
      expect((db as any).where).toHaveBeenCalledWith("status", "=", "active");
    });
  });

  describe("findById", () => {
    it("returns the property when found", async () => {
      const db = makeChain({ executeTakeFirst: PROPERTY_ROW });
      const repo = makeRepo(db);
      const result = await repo.findById("prop-1");
      expect(result?.id).toBe("prop-1");
    });

    it("returns undefined when not found", async () => {
      const db = makeChain({ executeTakeFirst: undefined });
      const repo = makeRepo(db);
      const result = await repo.findById("missing");
      expect(result).toBeUndefined();
    });
  });

  describe("findByName", () => {
    it("returns the property by name", async () => {
      const db = makeChain({ executeTakeFirst: PROPERTY_ROW });
      const repo = makeRepo(db);
      const result = await repo.findByName("Hotel Sol");
      expect(result?.name).toBe("Hotel Sol");
      expect((db as any).where).toHaveBeenCalledWith("name", "=", "Hotel Sol");
    });
  });

  describe("update", () => {
    it("updates and returns the property", async () => {
      const db = makeChain({
        executeTakeFirst: { ...PROPERTY_ROW, city: "CDMX" },
      });
      const repo = makeRepo(db);
      const result = await repo.update("prop-1", { city: "CDMX" });
      expect(result?.city).toBe("CDMX");
      expect((db as any).updateTable).toHaveBeenCalledWith("inv_properties");
    });
  });

  describe("softDelete", () => {
    it("sets status to inactive", async () => {
      const db = makeChain({ execute: [] });
      const repo = makeRepo(db);
      await repo.softDelete("prop-1");
      expect((db as any).updateTable).toHaveBeenCalledWith("inv_properties");
      expect((db as any).set).toHaveBeenCalledWith(
        expect.objectContaining({ status: "inactive" }),
      );
    });
  });
});
