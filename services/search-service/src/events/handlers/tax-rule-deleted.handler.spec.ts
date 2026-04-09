import { TaxRuleDeletedHandler } from "./tax-rule-deleted.handler.js";

function makeRepo() {
  return {
    bulkUpdateRoomSearchIndex: jest.fn().mockResolvedValue(undefined),
  };
}

function makeBookingClient(rules: object[] = []) {
  return { getTaxRules: jest.fn().mockResolvedValue(rules) };
}

describe("TaxRuleDeletedHandler", () => {
  it("re-queries booking-service after deletion", async () => {
    const repo = makeRepo();
    const bookingClient = makeBookingClient([]);
    const handler = new TaxRuleDeletedHandler(
      repo as any,
      bookingClient as any,
    );

    await handler.handle({ ruleId: "r1", country: "MX", city: "cancún" });

    expect(bookingClient.getTaxRules).toHaveBeenCalledWith("MX");
  });

  it("bulk-updates room_search_index to 0 when no active rules remain", async () => {
    const repo = makeRepo();
    const bookingClient = makeBookingClient([]);
    const handler = new TaxRuleDeletedHandler(
      repo as any,
      bookingClient as any,
    );

    await handler.handle({ ruleId: "r1", country: "MX", city: "cancún" });

    expect(repo.bulkUpdateRoomSearchIndex).toHaveBeenCalledWith(
      "MX",
      "cancún",
      0,
    );
  });

  it("bulk-updates with recomputed total when active rules remain", async () => {
    const repo = makeRepo();
    const bookingClient = makeBookingClient([
      {
        tax_name: "ISH",
        tax_type: "PERCENTAGE",
        rate: "3",
        city: "cancún",
        is_active: true,
      },
    ]);
    const handler = new TaxRuleDeletedHandler(
      repo as any,
      bookingClient as any,
    );

    await handler.handle({ ruleId: "r1", country: "MX", city: "cancún" });

    expect(repo.bulkUpdateRoomSearchIndex).toHaveBeenCalledWith(
      "MX",
      "cancún",
      3,
    );
  });

  it("city-wins precedence: city rule beats country rule with same tax_name", async () => {
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
    const handler = new TaxRuleDeletedHandler(
      repo as any,
      bookingClient as any,
    );

    await handler.handle({
      ruleId: "r-deleted",
      country: "MX",
      city: "cancún",
    });

    // city IVA 11 + ISH 3 = 14 (country IVA 16 excluded)
    expect(repo.bulkUpdateRoomSearchIndex).toHaveBeenCalledWith(
      "MX",
      "cancún",
      14,
    );
  });

  it("skips inactive rules when recomputing", async () => {
    const repo = makeRepo();
    const bookingClient = makeBookingClient([
      {
        tax_name: "IVA",
        tax_type: "PERCENTAGE",
        rate: "16",
        city: null,
        is_active: false,
      },
    ]);
    const handler = new TaxRuleDeletedHandler(
      repo as any,
      bookingClient as any,
    );

    await handler.handle({ ruleId: "r1", country: "MX" });

    expect(repo.bulkUpdateRoomSearchIndex).toHaveBeenCalledWith("MX", "", 0);
  });

  it("uses empty string for city when not provided", async () => {
    const repo = makeRepo();
    const bookingClient = makeBookingClient([]);
    const handler = new TaxRuleDeletedHandler(
      repo as any,
      bookingClient as any,
    );

    await handler.handle({ ruleId: "r1", country: "MX" });

    expect(repo.bulkUpdateRoomSearchIndex).toHaveBeenCalledWith("MX", "", 0);
  });

  it("swallows bulk update errors without throwing", async () => {
    const repo = makeRepo();
    repo.bulkUpdateRoomSearchIndex.mockRejectedValue(new Error("DB error"));
    const bookingClient = makeBookingClient([]);
    const handler = new TaxRuleDeletedHandler(
      repo as any,
      bookingClient as any,
    );

    await expect(
      handler.handle({ ruleId: "r1", country: "MX" }),
    ).resolves.not.toThrow();
  });
});
