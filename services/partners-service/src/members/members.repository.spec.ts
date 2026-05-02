import { NotFoundException } from "@nestjs/common";
import { MembersRepository } from "./members.repository.js";
import type {
  PartnerMemberRow,
  NewPartnerMember,
} from "../database/database.types.js";

const MEMBER_ROW = (
  overrides: Partial<PartnerMemberRow> = {},
): PartnerMemberRow => ({
  id: "member-uuid-1",
  partnerId: "partner-uuid-1",
  propertyId: "property-uuid-1",
  userId: "user-uuid-1",
  role: "manager",
  status: "active",
  createdAt: new Date("2026-01-01"),
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
  ];
  for (const m of methods) {
    builder[m] = jest.fn().mockReturnValue(builder);
  }
  builder["execute"] = jest.fn().mockResolvedValue(result);
  builder["executeTakeFirst"] = jest.fn().mockResolvedValue(result);
  builder["executeTakeFirstOrThrow"] = jest.fn().mockResolvedValue(result);
  return builder;
}

describe("MembersRepository", () => {
  // ─── findByPartnerId ──────────────────────────────────────────────────────────

  describe("findByPartnerId", () => {
    it("returns matching rows", async () => {
      const rows = [MEMBER_ROW()];
      const qb = makeQueryBuilder(rows);
      const repo = new MembersRepository(qb as never);
      const result = await repo.findByPartnerId("partner-uuid-1");
      expect(result).toEqual(rows);
      expect(qb.selectFrom).toHaveBeenCalledWith("partnerMembers");
      expect(qb.where).toHaveBeenCalledWith("partnerId", "=", "partner-uuid-1");
      expect(qb.orderBy).toHaveBeenCalledWith("createdAt", "asc");
    });
  });

  // ─── findByPropertyId ─────────────────────────────────────────────────────────

  describe("findByPropertyId", () => {
    it("returns matching rows", async () => {
      const rows = [MEMBER_ROW()];
      const qb = makeQueryBuilder(rows);
      const repo = new MembersRepository(qb as never);
      const result = await repo.findByPropertyId("property-uuid-1");
      expect(result).toEqual(rows);
      expect(qb.where).toHaveBeenCalledWith(
        "propertyId",
        "=",
        "property-uuid-1",
      );
    });
  });

  // ─── findByUserId ─────────────────────────────────────────────────────────────

  describe("findByUserId", () => {
    it("returns the member row when found", async () => {
      const row = MEMBER_ROW();
      const qb = makeQueryBuilder(row);
      const repo = new MembersRepository(qb as never);
      const result = await repo.findByUserId("user-uuid-1");
      expect(result).toEqual(row);
      expect(qb.where).toHaveBeenCalledWith("userId", "=", "user-uuid-1");
    });

    it("returns null when row is undefined", async () => {
      const qb = makeQueryBuilder(undefined);
      const repo = new MembersRepository(qb as never);
      const result = await repo.findByUserId("missing-user");
      expect(result).toBeNull();
    });
  });

  // ─── insert ───────────────────────────────────────────────────────────────────

  describe("insert", () => {
    it("returns the inserted row", async () => {
      const row = MEMBER_ROW();
      const qb = makeQueryBuilder(row);
      const repo = new MembersRepository(qb as never);
      const values: NewPartnerMember = {
        partnerId: "partner-uuid-1",
        propertyId: "property-uuid-1",
        userId: "user-uuid-1",
        role: "manager",
      };
      const result = await repo.insert(values);
      expect(result).toEqual(row);
      expect(qb.insertInto).toHaveBeenCalledWith("partnerMembers");
      expect(qb.values).toHaveBeenCalledWith(values);
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("resolves when row is deleted", async () => {
      const qb = makeQueryBuilder({ numDeletedRows: 1n });
      const repo = new MembersRepository(qb as never);
      await expect(repo.delete("member-uuid-1")).resolves.toBeUndefined();
      expect(qb.deleteFrom).toHaveBeenCalledWith("partnerMembers");
      expect(qb.where).toHaveBeenCalledWith("id", "=", "member-uuid-1");
    });

    it("throws NotFoundException when no row is deleted", async () => {
      const qb = makeQueryBuilder({ numDeletedRows: 0n });
      const repo = new MembersRepository(qb as never);
      await expect(repo.delete("bad-id")).rejects.toThrow(NotFoundException);
    });
  });
});
