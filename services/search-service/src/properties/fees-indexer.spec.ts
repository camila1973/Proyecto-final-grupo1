import { aggregateFlatFees, FeesIndexer } from "./fees-indexer.js";

const fee = (overrides: Partial<Record<string, unknown>>) => ({
  id: "fee",
  partner_id: "p1",
  property_id: null,
  fee_name: "x",
  fee_type: "FLAT_PER_NIGHT",
  rate: null,
  flat_amount: "0",
  currency: "USD",
  is_active: true,
  ...overrides,
});

describe("aggregateFlatFees", () => {
  it("sums partner-wide and property-scoped fees that match the property", () => {
    const fees = [
      fee({ fee_type: "FLAT_PER_NIGHT", flat_amount: "25", property_id: null }),
      fee({
        fee_type: "FLAT_PER_NIGHT",
        flat_amount: "12",
        property_id: "prop-A",
      }),
      fee({
        fee_type: "FLAT_PER_NIGHT",
        flat_amount: "99",
        property_id: "prop-B",
      }),
      fee({ fee_type: "FLAT_PER_STAY", flat_amount: "15", property_id: null }),
    ];
    expect(aggregateFlatFees(fees as any, "prop-A")).toEqual({
      perNight: 37,
      perStay: 15,
    });
  });

  it("excludes inactive fees", () => {
    const fees = [
      fee({ fee_type: "FLAT_PER_NIGHT", flat_amount: "25", is_active: false }),
      fee({ fee_type: "FLAT_PER_STAY", flat_amount: "15", is_active: true }),
    ];
    expect(aggregateFlatFees(fees as any, "prop-A")).toEqual({
      perNight: 0,
      perStay: 15,
    });
  });

  it("ignores PERCENTAGE fees", () => {
    const fees = [
      fee({ fee_type: "PERCENTAGE", flat_amount: null, rate: "8.0" }),
      fee({ fee_type: "FLAT_PER_NIGHT", flat_amount: "10" }),
    ];
    expect(aggregateFlatFees(fees as any, "prop-A")).toEqual({
      perNight: 10,
      perStay: 0,
    });
  });

  it("treats null flat_amount as 0", () => {
    const fees = [
      fee({ fee_type: "FLAT_PER_NIGHT", flat_amount: null }),
      fee({ fee_type: "FLAT_PER_STAY", flat_amount: null }),
    ];
    expect(aggregateFlatFees(fees as any, "prop-A")).toEqual({
      perNight: 0,
      perStay: 0,
    });
  });

  it("does not double-count a property-scoped fee for a different property", () => {
    const fees = [
      fee({
        fee_type: "FLAT_PER_STAY",
        flat_amount: "20",
        property_id: "prop-X",
      }),
    ];
    expect(aggregateFlatFees(fees as any, "prop-Y")).toEqual({
      perNight: 0,
      perStay: 0,
    });
  });
});

describe("FeesIndexer.refreshPartner", () => {
  it("updates each property of the partner with its applicable totals", async () => {
    const fees = [
      fee({ fee_type: "FLAT_PER_NIGHT", flat_amount: "25", property_id: null }),
      fee({
        fee_type: "FLAT_PER_NIGHT",
        flat_amount: "12",
        property_id: "prop-A",
      }),
      fee({ fee_type: "FLAT_PER_STAY", flat_amount: "15", property_id: null }),
    ];
    const bookingClient = { getPartnerFees: jest.fn().mockResolvedValue(fees) };
    const repo = {
      findPropertyIdsForPartner: jest
        .fn()
        .mockResolvedValue(["prop-A", "prop-B"]),
      updateFlatFeesForProperty: jest.fn().mockResolvedValue(undefined),
    };
    const indexer = new FeesIndexer(bookingClient as any, repo as any);

    await indexer.refreshPartner("p1");

    expect(bookingClient.getPartnerFees).toHaveBeenCalledWith("p1");
    expect(repo.updateFlatFeesForProperty).toHaveBeenCalledWith(
      "p1",
      "prop-A",
      37,
      15,
    );
    expect(repo.updateFlatFeesForProperty).toHaveBeenCalledWith(
      "p1",
      "prop-B",
      25,
      15,
    );
  });

  it("is a no-op when the partner has no rooms in the index", async () => {
    const bookingClient = { getPartnerFees: jest.fn().mockResolvedValue([]) };
    const repo = {
      findPropertyIdsForPartner: jest.fn().mockResolvedValue([]),
      updateFlatFeesForProperty: jest.fn(),
    };
    const indexer = new FeesIndexer(bookingClient as any, repo as any);

    await indexer.refreshPartner("p1");

    expect(repo.updateFlatFeesForProperty).not.toHaveBeenCalled();
  });
});
