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
    it("returns checkInKey when an active row exists", async () => {
      const qb = makeQueryBuilder({ checkInKey: CHECK_IN_KEY });
      const repo = new PropertyCheckinKeyRepository(qb as never);

      const result = await repo.findActiveKey(PARTNER_ID, PROPERTY_ID);

      expect(result).toBe(CHECK_IN_KEY);
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
    it("returns the new checkInKey after update", async () => {
      const newKey = "newkey123";
      const qb = makeQueryBuilder({ checkInKey: newKey });
      const repo = new PropertyCheckinKeyRepository(qb as never);

      const result = await repo.rotateKey(PARTNER_ID, PROPERTY_ID, newKey);

      expect(result).toBe(newKey);
      expect(qb.updateTable).toHaveBeenCalledWith("propertyCheckInKeys");
      expect(qb.set).toHaveBeenCalledWith({ checkInKey: newKey });
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
