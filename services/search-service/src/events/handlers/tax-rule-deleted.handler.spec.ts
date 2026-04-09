import { TaxRuleDeletedHandler } from "./tax-rule-deleted.handler.js";

function makeCache() {
  return {
    delete: jest.fn(),
    bulkUpdateRoomSearchIndex: jest.fn(),
  };
}

describe("TaxRuleDeletedHandler", () => {
  it("deletes cache entry and bulk-updates rooms to 0%", async () => {
    const cache = makeCache();
    cache.delete.mockResolvedValue(undefined);
    cache.bulkUpdateRoomSearchIndex.mockResolvedValue(undefined);

    const handler = new TaxRuleDeletedHandler(cache as any);
    await handler.handle({ ruleId: "r1", country: "MX", city: "cancún" });

    expect(cache.delete).toHaveBeenCalledWith("MX", "cancún");
    expect(cache.bulkUpdateRoomSearchIndex).toHaveBeenCalledWith(
      "MX",
      "cancún",
      0,
    );
  });

  it("uses empty string for city when not provided", async () => {
    const cache = makeCache();
    cache.delete.mockResolvedValue(undefined);
    cache.bulkUpdateRoomSearchIndex.mockResolvedValue(undefined);

    const handler = new TaxRuleDeletedHandler(cache as any);
    await handler.handle({ ruleId: "r1", country: "MX" });

    expect(cache.delete).toHaveBeenCalledWith("MX", "");
    expect(cache.bulkUpdateRoomSearchIndex).toHaveBeenCalledWith("MX", "", 0);
  });

  it("swallows bulk update errors without throwing", async () => {
    const cache = makeCache();
    cache.delete.mockResolvedValue(undefined);
    cache.bulkUpdateRoomSearchIndex.mockRejectedValue(new Error("DB error"));

    const handler = new TaxRuleDeletedHandler(cache as any);
    await expect(
      handler.handle({ ruleId: "r1", country: "MX" }),
    ).resolves.not.toThrow();
  });
});
