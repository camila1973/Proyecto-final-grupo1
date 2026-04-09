import { TaxRuleUpsertedHandler } from "./tax-rule-upserted.handler.js";

function makeCache() {
  return {
    lookup: jest.fn(),
    upsert: jest.fn(),
    bulkUpdateRoomSearchIndex: jest.fn(),
  };
}

describe("TaxRuleUpsertedHandler", () => {
  it("does nothing when taxType is not PERCENTAGE", async () => {
    const cache = makeCache();
    const handler = new TaxRuleUpsertedHandler(cache as any);

    await handler.handle({
      ruleId: "r1",
      country: "MX",
      taxName: "Resort",
      taxType: "FLAT_PER_STAY",
      currency: "USD",
      effectiveFrom: "2026-01-01",
    });

    expect(cache.lookup).not.toHaveBeenCalled();
    expect(cache.upsert).not.toHaveBeenCalled();
  });

  it("does nothing when rate is falsy", async () => {
    const cache = makeCache();
    const handler = new TaxRuleUpsertedHandler(cache as any);

    await handler.handle({
      ruleId: "r1",
      country: "MX",
      taxName: "IVA",
      taxType: "PERCENTAGE",
      rate: 0,
      currency: "USD",
      effectiveFrom: "2026-01-01",
    });

    expect(cache.lookup).not.toHaveBeenCalled();
  });

  it("accumulates rate on top of existing total and upserts", async () => {
    const cache = makeCache();
    cache.lookup.mockResolvedValue(8);
    cache.upsert.mockResolvedValue(undefined);
    cache.bulkUpdateRoomSearchIndex.mockResolvedValue(undefined);

    const handler = new TaxRuleUpsertedHandler(cache as any);
    await handler.handle({
      ruleId: "r1",
      country: "MX",
      city: "cancún",
      taxName: "IVA",
      taxType: "PERCENTAGE",
      rate: 16,
      currency: "USD",
      effectiveFrom: "2026-01-01",
    });

    expect(cache.lookup).toHaveBeenCalledWith("MX", "cancún");
    expect(cache.upsert).toHaveBeenCalledWith("MX", "cancún", 24);
    expect(cache.bulkUpdateRoomSearchIndex).toHaveBeenCalledWith(
      "MX",
      "cancún",
      24,
    );
  });

  it("uses empty string for city when not provided", async () => {
    const cache = makeCache();
    cache.lookup.mockResolvedValue(0);
    cache.upsert.mockResolvedValue(undefined);
    cache.bulkUpdateRoomSearchIndex.mockResolvedValue(undefined);

    const handler = new TaxRuleUpsertedHandler(cache as any);
    await handler.handle({
      ruleId: "r1",
      country: "MX",
      taxName: "IVA",
      taxType: "PERCENTAGE",
      rate: 16,
      currency: "USD",
      effectiveFrom: "2026-01-01",
    });

    expect(cache.lookup).toHaveBeenCalledWith("MX", "");
    expect(cache.upsert).toHaveBeenCalledWith("MX", "", 16);
  });

  it("swallows bulk update errors without throwing", async () => {
    const cache = makeCache();
    cache.lookup.mockResolvedValue(0);
    cache.upsert.mockResolvedValue(undefined);
    cache.bulkUpdateRoomSearchIndex.mockRejectedValue(new Error("DB down"));

    const handler = new TaxRuleUpsertedHandler(cache as any);
    await expect(
      handler.handle({
        ruleId: "r1",
        country: "MX",
        taxName: "IVA",
        taxType: "PERCENTAGE",
        rate: 10,
        currency: "USD",
        effectiveFrom: "2026-01-01",
      }),
    ).resolves.not.toThrow();
  });
});
