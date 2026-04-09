import { TaxRuleUpsertedHandler } from "./tax-rule-upserted.handler.js";

function makeRepo() {
  return {
    bulkUpdateRoomSearchIndex: jest.fn().mockResolvedValue(undefined),
  };
}

function makeBookingClient(rules: object[] = []) {
  return {
    getTaxRules: jest.fn().mockResolvedValue(rules),
  };
}

describe("TaxRuleUpsertedHandler", () => {
  it("re-queries booking-service and upserts computed total", async () => {
    const repo = makeRepo();
    const bookingClient = makeBookingClient([
      {
        tax_name: "IVA",
        tax_type: "PERCENTAGE",
        rate: "16",
        city: null,
        is_active: true,
      },
    ]);
    const handler = new TaxRuleUpsertedHandler(
      repo as any,
      bookingClient as any,
    );

    await handler.handle({
      ruleId: "r1",
      country: "MX",
      taxName: "IVA",
      taxType: "PERCENTAGE",
      rate: 16,
      currency: "USD",
      effectiveFrom: "2026-01-01",
    });

    expect(bookingClient.getTaxRules).toHaveBeenCalledWith("MX");
    expect(repo.bulkUpdateRoomSearchIndex).toHaveBeenCalledWith("MX", "", 16);
  });

  it("applies city-wins precedence: city IVA overrides country IVA, ISH cumulative", async () => {
    const repo = makeRepo();
    const bookingClient = makeBookingClient([
      {
        tax_name: "IVA",
        tax_type: "PERCENTAGE",
        rate: "16",
        city: null,
        is_active: true,
      },
      {
        tax_name: "IVA",
        tax_type: "PERCENTAGE",
        rate: "11",
        city: "cancún",
        is_active: true,
      },
      {
        tax_name: "ISH",
        tax_type: "PERCENTAGE",
        rate: "3",
        city: "cancún",
        is_active: true,
      },
    ]);
    const handler = new TaxRuleUpsertedHandler(
      repo as any,
      bookingClient as any,
    );

    await handler.handle({
      ruleId: "r2",
      country: "MX",
      city: "cancún",
      taxName: "IVA",
      taxType: "PERCENTAGE",
      rate: 11,
      currency: "USD",
      effectiveFrom: "2026-01-01",
    });

    // city IVA (11) wins over country IVA (16); ISH (3) applies too → total 14
    expect(repo.bulkUpdateRoomSearchIndex).toHaveBeenCalledWith(
      "MX",
      "cancún",
      14,
    );
  });

  it("Colombia: IVA 19% + INC 8% both apply (different tax_name)", async () => {
    const repo = makeRepo();
    const bookingClient = makeBookingClient([
      {
        tax_name: "IVA",
        tax_type: "PERCENTAGE",
        rate: "19",
        city: null,
        is_active: true,
      },
      {
        tax_name: "INC",
        tax_type: "PERCENTAGE",
        rate: "8",
        city: null,
        is_active: true,
      },
    ]);
    const handler = new TaxRuleUpsertedHandler(
      repo as any,
      bookingClient as any,
    );

    await handler.handle({
      ruleId: "r3",
      country: "CO",
      taxName: "IVA",
      taxType: "PERCENTAGE",
      rate: 19,
      currency: "USD",
      effectiveFrom: "2026-01-01",
    });

    expect(repo.bulkUpdateRoomSearchIndex).toHaveBeenCalledWith("CO", "", 27);
  });

  it("skips inactive rules when computing total", async () => {
    const repo = makeRepo();
    const bookingClient = makeBookingClient([
      {
        tax_name: "IVA",
        tax_type: "PERCENTAGE",
        rate: "16",
        city: null,
        is_active: true,
      },
      {
        tax_name: "OLD",
        tax_type: "PERCENTAGE",
        rate: "5",
        city: null,
        is_active: false,
      },
    ]);
    const handler = new TaxRuleUpsertedHandler(
      repo as any,
      bookingClient as any,
    );

    await handler.handle({
      ruleId: "r4",
      country: "MX",
      taxName: "IVA",
      taxType: "PERCENTAGE",
      rate: 16,
      currency: "USD",
      effectiveFrom: "2026-01-01",
    });

    expect(repo.bulkUpdateRoomSearchIndex).toHaveBeenCalledWith("MX", "", 16);
  });

  it("swallows bulk update errors without throwing", async () => {
    const repo = makeRepo();
    repo.bulkUpdateRoomSearchIndex.mockRejectedValue(new Error("DB down"));
    const bookingClient = makeBookingClient([
      {
        tax_name: "IVA",
        tax_type: "PERCENTAGE",
        rate: "10",
        city: null,
        is_active: true,
      },
    ]);
    const handler = new TaxRuleUpsertedHandler(
      repo as any,
      bookingClient as any,
    );

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
