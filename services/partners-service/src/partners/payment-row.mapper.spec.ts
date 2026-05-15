import { mapSnapshotToPaymentRow, countNights } from "./payment-row.mapper.js";

describe("mapSnapshotToPaymentRow", () => {
  const FB = {
    reservationId: "res-1",
    propertyId: "prop-1",
    propertyName: "Hotel Alpha",
    status: "confirmed",
    grandTotalUsd: 1190,
    createdAt: "2026-04-01T10:00:00.000Z",
  };

  it("uses snapshotted breakdown when payment is present", () => {
    const row = mapSnapshotToPaymentRow(
      {
        propertyId: "prop-1",
        propertyName: "Hotel Alpha",
        status: "captured",
        stripePaymentIntentId: "pi_123",
        grossAmountUsd: 1190,
        taxAmountUsd: 190,
        commissionAmountUsd: 238,
        netPayoutUsd: 952,
        amountUsd: 1190,
        createdAt: "2026-04-02T09:00:00.000Z",
      },
      FB,
      2,
    );
    expect(row).toMatchObject({
      reservationId: "res-1",
      propertyId: "prop-1",
      propertyName: "Hotel Alpha",
      status: "captured",
      paymentMethod: "STRIPE",
      reference: "pi_123",
      nights: 2,
      taxesUsd: 190,
      totalPaidUsd: 1190,
      earningsUsd: 952,
    });
    // subtotal = total - taxes = 1000; rate = 500/night
    expect(row.subtotalUsd).toBe(1000);
    expect(row.ratePerNightUsd).toBe(500);
    // Commission stored as negative (matches UI display convention).
    expect(row.commissionUsd).toBe(-238);
  });

  it("falls back to reservation totals + default rates when payment is null", () => {
    const row = mapSnapshotToPaymentRow(null, FB, 2);
    // Without a payment row, taxes are derived from 19% inclusive rate:
    // taxes = 1190 - 1190 / 1.19 = 190; subtotal = 1000; commission = 20%
    expect(row.taxesUsd).toBeCloseTo(190, 2);
    expect(row.subtotalUsd).toBeCloseTo(1000, 2);
    expect(row.commissionUsd).toBeCloseTo(-238, 2);
    expect(row.earningsUsd).toBeCloseTo(952, 2);
    expect(row.paymentMethod).toBe("—");
    expect(row.reference).toBe("—");
    expect(row.reservationId).toBe("res-1");
    expect(row.propertyName).toBe("Hotel Alpha");
  });

  it("returns rate=0 when nights is zero (defensive)", () => {
    const row = mapSnapshotToPaymentRow(null, FB, 0);
    expect(row.nights).toBe(0);
    expect(row.ratePerNightUsd).toBe(0);
  });

  it("returns reservationId from fallback when payment lacks property info", () => {
    const row = mapSnapshotToPaymentRow(
      { stripePaymentIntentId: null, grossAmountUsd: 100, taxAmountUsd: 0 },
      { reservationId: "res-z", grandTotalUsd: 100, createdAt: "2026-01-01" },
      1,
    );
    expect(row.reservationId).toBe("res-z");
    expect(row.propertyId).toBe("");
    expect(row.propertyName).toBe("");
  });
});

describe("countNights", () => {
  it("computes whole-day count between dates", () => {
    expect(countNights("2026-04-01", "2026-04-05")).toBe(4);
  });

  it("returns 0 for invalid or reversed ranges", () => {
    expect(countNights("2026-04-05", "2026-04-01")).toBe(0);
    expect(countNights("garbage", "2026-04-05")).toBe(0);
  });
});
