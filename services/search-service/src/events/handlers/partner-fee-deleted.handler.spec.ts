import { PartnerFeeDeletedHandler } from "./partner-fee-deleted.handler.js";

function makeCache() {
  return { softDelete: jest.fn() };
}

describe("PartnerFeeDeletedHandler", () => {
  it("soft-deletes the cache entry by feeId", async () => {
    const cache = makeCache();
    cache.softDelete.mockResolvedValue(undefined);
    const handler = new PartnerFeeDeletedHandler(cache as any);

    await handler.handle({ feeId: "fee-1", partnerId: "partner-1" });

    expect(cache.softDelete).toHaveBeenCalledWith("fee-1");
  });
});
