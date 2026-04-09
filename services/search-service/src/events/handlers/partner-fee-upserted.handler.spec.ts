import { PartnerFeeUpsertedHandler } from "./partner-fee-upserted.handler.js";

function makeCache() {
  return { upsert: jest.fn() };
}

describe("PartnerFeeUpsertedHandler", () => {
  it("upserts the cache entry with all payload fields", async () => {
    const cache = makeCache();
    cache.upsert.mockResolvedValue(undefined);
    const handler = new PartnerFeeUpsertedHandler(cache as any);

    await handler.handle({
      feeId: "fee-1",
      partnerId: "partner-1",
      propertyId: "prop-1",
      feeName: "Resort Fee",
      feeType: "FLAT_PER_NIGHT",
      flatAmount: 25,
      currency: "USD",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2027-01-01",
    });

    expect(cache.upsert).toHaveBeenCalledWith({
      id: "fee-1",
      partnerId: "partner-1",
      propertyId: "prop-1",
      feeName: "Resort Fee",
      feeType: "FLAT_PER_NIGHT",
      flatAmount: 25,
      currency: "USD",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2027-01-01",
      rate: undefined,
    });
  });

  it("handles missing optional fields", async () => {
    const cache = makeCache();
    cache.upsert.mockResolvedValue(undefined);
    const handler = new PartnerFeeUpsertedHandler(cache as any);

    await handler.handle({
      feeId: "fee-2",
      partnerId: "partner-2",
      feeName: "Svc Fee",
      feeType: "PERCENTAGE",
      rate: 5,
      currency: "USD",
      effectiveFrom: "2026-01-01",
    });

    expect(cache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "fee-2",
        propertyId: undefined,
        effectiveTo: undefined,
      }),
    );
  });
});
