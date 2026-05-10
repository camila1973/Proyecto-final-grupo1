import { PropertyCheckinKeyRepository } from "./property-checkin-key.repository.js";

function makeQueryBuilder(result: unknown) {
  const b: Record<string, jest.Mock> = {};
  const methods = [
    "selectFrom",
    "selectAll",
    "select",
    "where",
    "updateTable",
    "set",
    "returning",
    "execute",
    "executeTakeFirst",
  ];
  for (const m of methods) b[m] = jest.fn().mockReturnValue(b);
  b["execute"] = jest.fn().mockResolvedValue(result);
  b["executeTakeFirst"] = jest.fn().mockResolvedValue(result);
  return b;
}

const PARTNER_ID = "a1000000-0000-0000-0000-000000000001";
const PROPERTY_ID = "b1000000-0000-0000-0000-000000000001";
const CHECK_IN_KEY = "abc123def456";

describe("PropertyCheckinKeyRepository", () => {
  // ─── findActiveKey ───────────────────────────────────────────────────────────

  describe("findActiveKey", () => {
    it("returns the row when an active key exists", async () => {
      const createdAt = new Date("2026-03-12T10:00:00Z");
      const qb = makeQueryBuilder({ checkInKey: CHECK_IN_KEY, createdAt });
      const repo = new PropertyCheckinKeyRepository(qb as never);

      const result = await repo.findActiveKey(PARTNER_ID, PROPERTY_ID);

      expect(result).toEqual({ checkInKey: CHECK_IN_KEY, createdAt });
      expect(qb.selectFrom).toHaveBeenCalledWith("propertyCheckInKeys");
      expect(qb.where).toHaveBeenCalledWith("partnerId", "=", PARTNER_ID);
      expect(qb.where).toHaveBeenCalledWith("propertyId", "=", PROPERTY_ID);
      expect(qb.where).toHaveBeenCalledWith("enabled", "=", true);
    });

    it("returns null when no active row exists", async () => {
      const qb = makeQueryBuilder(undefined);
      const repo = new PropertyCheckinKeyRepository(qb as never);

      const result = await repo.findActiveKey(PARTNER_ID, PROPERTY_ID);

      expect(result).toBeNull();
    });
  });

  // ─── rotateKey ───────────────────────────────────────────────────────────────

  describe("rotateKey", () => {
    it("returns the row with the new checkInKey and updated timestamp", async () => {
      const newKey = "newkey123";
      const createdAt = new Date("2026-04-01T08:30:00Z");
      const qb = makeQueryBuilder({ checkInKey: newKey, createdAt });
      const repo = new PropertyCheckinKeyRepository(qb as never);

      const result = await repo.rotateKey(PARTNER_ID, PROPERTY_ID, newKey);

      expect(result).toEqual({ checkInKey: newKey, createdAt });
      expect(qb.updateTable).toHaveBeenCalledWith("propertyCheckInKeys");
      expect(qb.set).toHaveBeenCalledWith({
        checkInKey: newKey,
        createdAt: expect.any(Date) as Date,
      });
      expect(qb.where).toHaveBeenCalledWith("partnerId", "=", PARTNER_ID);
      expect(qb.where).toHaveBeenCalledWith("propertyId", "=", PROPERTY_ID);
      expect(qb.where).toHaveBeenCalledWith("enabled", "=", true);
    });

    it("returns null when no active row exists to update", async () => {
      const qb = makeQueryBuilder(undefined);
      const repo = new PropertyCheckinKeyRepository(qb as never);

      const result = await repo.rotateKey(PARTNER_ID, PROPERTY_ID, "newkey");

      expect(result).toBeNull();
    });
  });
});
