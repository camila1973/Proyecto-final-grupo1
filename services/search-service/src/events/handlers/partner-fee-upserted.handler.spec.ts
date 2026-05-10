import { PartnerFeeUpsertedHandler } from "./partner-fee-upserted.handler.js";

function makeIndexer() {
  return { refreshPartner: jest.fn().mockResolvedValue(undefined) };
}

describe("PartnerFeeUpsertedHandler", () => {
  it("delegates to FeesIndexer.refreshPartner with partnerId", async () => {
    const indexer = makeIndexer();
    const handler = new PartnerFeeUpsertedHandler(indexer as any);

    await handler.handle({
      feeId: "fee-1",
      partnerId: "partner-1",
      feeName: "Resort Fee",
      feeType: "FLAT_PER_NIGHT",
      flatAmount: 25,
      currency: "USD",
      effectiveFrom: "2026-01-01",
    });

    expect(indexer.refreshPartner).toHaveBeenCalledWith("partner-1");
  });

  it("swallows refresh errors without throwing", async () => {
    const indexer = makeIndexer();
    indexer.refreshPartner.mockRejectedValue(new Error("DB down"));
    const handler = new PartnerFeeUpsertedHandler(indexer as any);

    await expect(
      handler.handle({
        feeId: "fee-1",
        partnerId: "partner-1",
        feeName: "Resort Fee",
        feeType: "FLAT_PER_NIGHT",
        flatAmount: 25,
        currency: "USD",
        effectiveFrom: "2026-01-01",
      }),
    ).resolves.not.toThrow();
  });
});
