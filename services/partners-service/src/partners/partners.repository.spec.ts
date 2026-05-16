import { NotFoundException } from "@nestjs/common";
import { PartnersRepository } from "./partners.repository.js";
import type { PartnerRow, NewPartner } from "../database/database.types.js";

const PARTNER_ROW = (overrides: Partial<PartnerRow> = {}): PartnerRow => ({
  id: "partner-uuid-1",
  name: "Hotel Alpha",
  slug: "hotel-alpha",
  identifier: "PAR-0001",
  status: "active",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
  ...overrides,
});

function makeQueryBuilder(result: unknown) {
  const builder: Record<string, jest.Mock> = {};
  const methods = [
    "selectFrom",
    "selectAll",
    "where",
    "orderBy",
    "execute",
    "executeTakeFirst",
    "executeTakeFirstOrThrow",
    "insertInto",
    "values",
    "returningAll",
    "deleteFrom",
    "updateTable",
    "set",
  ];
  for (const m of methods) {
    builder[m] = jest.fn().mockReturnValue(builder);
  }
  builder["execute"] = jest.fn().mockResolvedValue(result);
  builder["executeTakeFirst"] = jest.fn().mockResolvedValue(result);
  builder["executeTakeFirstOrThrow"] = jest.fn().mockResolvedValue(result);
  return builder;
}

describe("PartnersRepository", () => {
  describe("findAll", () => {
    it("returns rows sorted by name", async () => {
      const rows = [PARTNER_ROW()];
      const qb = makeQueryBuilder(rows);
      const repo = new PartnersRepository(qb as never);
      const result = await repo.findAll();
      expect(result).toEqual(rows);
      expect(qb.selectFrom).toHaveBeenCalledWith("partners");
      expect(qb.orderBy).toHaveBeenCalledWith("name");
    });
  });

  describe("findById", () => {
    it("returns the row when found", async () => {
      const row = PARTNER_ROW();
      const qb = makeQueryBuilder(row);
      const repo = new PartnersRepository(qb as never);
      const result = await repo.findById("partner-uuid-1");
      expect(result).toEqual(row);
      expect(qb.where).toHaveBeenCalledWith("id", "=", "partner-uuid-1");
    });

    it("throws NotFoundException when no row exists", async () => {
      const qb = makeQueryBuilder(undefined);
      const repo = new PartnersRepository(qb as never);
      await expect(repo.findById("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("findBySlug", () => {
    it("returns row when found", async () => {
      const row = PARTNER_ROW();
      const qb = makeQueryBuilder(row);
      const repo = new PartnersRepository(qb as never);
      const result = await repo.findBySlug("hotel-alpha");
      expect(result).toEqual(row);
      expect(qb.where).toHaveBeenCalledWith("slug", "=", "hotel-alpha");
    });

    it("returns null when no row exists", async () => {
      const qb = makeQueryBuilder(undefined);
      const repo = new PartnersRepository(qb as never);
      const result = await repo.findBySlug("missing");
      expect(result).toBeNull();
    });
  });

  describe("insert", () => {
    it("returns the inserted row", async () => {
      const row = PARTNER_ROW();
      const qb = makeQueryBuilder(row);
      const repo = new PartnersRepository(qb as never);
      const values: NewPartner = {
        name: "Hotel Alpha",
        slug: "hotel-alpha",
      };
      const result = await repo.insert(values);
      expect(result).toEqual(row);
      expect(qb.insertInto).toHaveBeenCalledWith("partners");
      expect(qb.values).toHaveBeenCalledWith(values);
    });
  });

  describe("update", () => {
    it("returns the updated row with updatedAt set", async () => {
      const row = PARTNER_ROW();
      const qb = makeQueryBuilder(row);
      const repo = new PartnersRepository(qb as never);
      const result = await repo.update("partner-uuid-1", { name: "New Name" });
      expect(result).toEqual(row);
      expect(qb.updateTable).toHaveBeenCalledWith("partners");
      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Name",
          updatedAt: expect.any(Date) as Date,
        }),
      );
    });

    it("throws NotFoundException when row missing", async () => {
      const qb = makeQueryBuilder(undefined);
      const repo = new PartnersRepository(qb as never);
      await expect(repo.update("missing", { name: "X" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("delete", () => {
    it("issues a delete with the matching id", async () => {
      const qb = makeQueryBuilder({ numDeletedRows: 1n });
      const repo = new PartnersRepository(qb as never);
      await expect(repo.delete("partner-uuid-1")).resolves.toBeUndefined();
      expect(qb.deleteFrom).toHaveBeenCalledWith("partners");
      expect(qb.where).toHaveBeenCalledWith("id", "=", "partner-uuid-1");
    });
  });
});
