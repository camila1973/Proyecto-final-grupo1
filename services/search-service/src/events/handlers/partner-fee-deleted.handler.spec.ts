import { PartnerFeeDeletedHandler } from "./partner-fee-deleted.handler.js";

function makeBookingClient(fees: object[] = []) {
  return { getPartnerFees: jest.fn().mockResolvedValue(fees) };
}

function makeRepo() {
  return { bulkUpdateFlatFees: jest.fn().mockResolvedValue(undefined) };
}

describe("PartnerFeeDeletedHandler", () => {
  it("re-queries booking-service after deletion", async () => {
    const bookingClient = makeBookingClient([]);
    const repo = makeRepo();
    const handler = new PartnerFeeDeletedHandler(
      bookingClient as any,
      repo as any,
    );

    await handler.handle({ feeId: "fee-1", partnerId: "partner-1" });

    expect(bookingClient.getPartnerFees).toHaveBeenCalledWith("partner-1");
  });

  it("re-queries booking-service and updates flat fees after deletion", async () => {
    // The deleted fee is already inactive in booking-service
    const bookingClient = makeBookingClient([
      { fee_type: "FLAT_PER_NIGHT", flat_amount: "20", is_active: true },
    ]);
    const repo = makeRepo();
    const handler = new PartnerFeeDeletedHandler(
      bookingClient as any,
      repo as any,
    );

    await handler.handle({ feeId: "fee-1", partnerId: "partner-1" });

    expect(repo.bulkUpdateFlatFees).toHaveBeenCalledWith("partner-1", 20, 0);
  });

  it("sets totals to 0 when no active flat fees remain after deletion", async () => {
    const bookingClient = makeBookingClient([]);
    const repo = makeRepo();
    const handler = new PartnerFeeDeletedHandler(
      bookingClient as any,
      repo as any,
    );

    await handler.handle({ feeId: "fee-1", partnerId: "partner-1" });

    expect(repo.bulkUpdateFlatFees).toHaveBeenCalledWith("partner-1", 0, 0);
  });

  it("swallows bulk update errors without throwing", async () => {
    const bookingClient = makeBookingClient([]);
    const repo = makeRepo();
    repo.bulkUpdateFlatFees.mockRejectedValue(new Error("DB down"));
    const handler = new PartnerFeeDeletedHandler(
      bookingClient as any,
      repo as any,
    );

    await expect(
      handler.handle({ feeId: "fee-1", partnerId: "partner-1" }),
    ).resolves.not.toThrow();
  });
});
