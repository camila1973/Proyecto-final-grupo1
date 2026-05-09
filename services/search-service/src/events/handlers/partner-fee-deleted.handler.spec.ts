import { PartnerFeeDeletedHandler } from "./partner-fee-deleted.handler.js";

function makeIndexer() {
  return { refreshPartner: jest.fn().mockResolvedValue(undefined) };
}

describe("PartnerFeeDeletedHandler", () => {
  it("delegates to FeesIndexer.refreshPartner with partnerId", async () => {
    const indexer = makeIndexer();
    const handler = new PartnerFeeDeletedHandler(indexer as any);

    await handler.handle({ feeId: "fee-1", partnerId: "partner-1" });

    expect(indexer.refreshPartner).toHaveBeenCalledWith("partner-1");
  });

  it("swallows refresh errors without throwing", async () => {
    const indexer = makeIndexer();
    indexer.refreshPartner.mockRejectedValue(new Error("DB down"));
    const handler = new PartnerFeeDeletedHandler(indexer as any);

    await expect(
      handler.handle({ feeId: "fee-1", partnerId: "partner-1" }),
    ).resolves.not.toThrow();
  });
});
