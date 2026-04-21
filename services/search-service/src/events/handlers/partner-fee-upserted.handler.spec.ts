import { PartnerFeeUpsertedHandler } from "./partner-fee-upserted.handler.js";

function makeBookingClient(fees: object[] = []) {
  return { getPartnerFees: jest.fn().mockResolvedValue(fees) };
}

function makeRepo() {
  return { bulkUpdateFlatFees: jest.fn().mockResolvedValue(undefined) };
}

describe("PartnerFeeUpsertedHandler", () => {
  it("re-queries booking-service for partner fees", async () => {
    const bookingClient = makeBookingClient([]);
    const repo = makeRepo();
    const handler = new PartnerFeeUpsertedHandler(
      bookingClient as any,
      repo as any,
    );

    await handler.handle({
      feeId: "fee-1",
      partnerId: "partner-1",
      feeName: "Resort Fee",
      feeType: "FLAT_PER_NIGHT",
      flatAmount: 25,
      currency: "USD",
      effectiveFrom: "2026-01-01",
    });

    expect(bookingClient.getPartnerFees).toHaveBeenCalledWith("partner-1");
  });

  it("aggregates flat fees and calls bulkUpdateFlatFees", async () => {
    const bookingClient = makeBookingClient([
      { fee_type: "FLAT_PER_NIGHT", flat_amount: "15", is_active: true },
      { fee_type: "FLAT_PER_NIGHT", flat_amount: "20", is_active: true },
      { fee_type: "FLAT_PER_STAY", flat_amount: "50", is_active: true },
      { fee_type: "PERCENTAGE", flat_amount: null, is_active: true },
    ]);
    const repo = makeRepo();
    const handler = new PartnerFeeUpsertedHandler(
      bookingClient as any,
      repo as any,
    );

    await handler.handle({
      feeId: "fee-1",
      partnerId: "partner-1",
      feeName: "Resort Fee",
      feeType: "FLAT_PER_NIGHT",
      flatAmount: 15,
      currency: "USD",
      effectiveFrom: "2026-01-01",
    });

    // flatPerNight = 15 + 20 = 35, flatPerStay = 50
    expect(repo.bulkUpdateFlatFees).toHaveBeenCalledWith("partner-1", 35, 50);
  });

  it("sets both totals to 0 when no active flat fees remain", async () => {
    const bookingClient = makeBookingClient([
      { fee_type: "FLAT_PER_NIGHT", flat_amount: "25", is_active: false },
    ]);
    const repo = makeRepo();
    const handler = new PartnerFeeUpsertedHandler(
      bookingClient as any,
      repo as any,
    );

    await handler.handle({
      feeId: "fee-1",
      partnerId: "partner-1",
      feeName: "Resort Fee",
      feeType: "FLAT_PER_NIGHT",
      flatAmount: 25,
      currency: "USD",
      effectiveFrom: "2026-01-01",
    });

    expect(repo.bulkUpdateFlatFees).toHaveBeenCalledWith("partner-1", 0, 0);
  });

  it("swallows bulk update errors without throwing", async () => {
    const bookingClient = makeBookingClient([]);
    const repo = makeRepo();
    repo.bulkUpdateFlatFees.mockRejectedValue(new Error("DB down"));
    const handler = new PartnerFeeUpsertedHandler(
      bookingClient as any,
      repo as any,
    );

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

  it("treats null flat_amount as 0 for active flat fees", async () => {
    const bookingClient = makeBookingClient([
      { fee_type: "FLAT_PER_NIGHT", flat_amount: null, is_active: true },
      { fee_type: "FLAT_PER_STAY", flat_amount: null, is_active: true },
    ]);
    const repo = makeRepo();
    const handler = new PartnerFeeUpsertedHandler(
      bookingClient as any,
      repo as any,
    );

    await handler.handle({
      feeId: "fee-1",
      partnerId: "partner-1",
      feeName: "Resort Fee",
      feeType: "FLAT_PER_NIGHT",
      currency: "USD",
      effectiveFrom: "2026-01-01",
    });

    expect(repo.bulkUpdateFlatFees).toHaveBeenCalledWith("partner-1", 0, 0);
  });
});
