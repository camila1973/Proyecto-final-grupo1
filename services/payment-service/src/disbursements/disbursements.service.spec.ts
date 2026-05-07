import { DisbursementsService } from "./disbursements.service.js";
import { CapturedPaymentForPeriod } from "./disbursements.repository.js";

function makeRepo() {
  return {
    findCapturedInPeriod: jest.fn<Promise<CapturedPaymentForPeriod[]>, any[]>(),
    upsertHeader: jest.fn(),
    writeItemsAndTotals: jest.fn().mockResolvedValue(undefined),
    findByPeriod: jest.fn(),
  };
}

function row(
  overrides: Partial<CapturedPaymentForPeriod> = {},
): CapturedPaymentForPeriod {
  return {
    payment_id: "pay-1",
    property_id: "prop-1",
    property_name: "Hotel A",
    gross_amount_usd: "100.00",
    tax_amount_usd: "19.00",
    partner_fee_usd: "5.00",
    commission_amount_usd: "20.00",
    net_payout_usd: "80.00",
    ...overrides,
  };
}

function pastMonth(): string {
  // A month that is definitely in the past (last year, January).
  const d = new Date();
  return `${d.getUTCFullYear() - 1}-01`;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

describe("DisbursementsService", () => {
  let repo: ReturnType<typeof makeRepo>;
  let service: DisbursementsService;

  beforeEach(() => {
    repo = makeRepo();
    service = new DisbursementsService(repo as any);
  });

  describe("past month — materializes", () => {
    beforeEach(() => {
      repo.upsertHeader.mockResolvedValue({
        id: "disb-1",
        partner_id: "partner-1",
        period_start: "2024-01-01",
        period_end: "2024-02-01",
        scheduled_for: "2024-02-01",
        currency: "USD",
        gross_total_usd: "0",
        tax_total_usd: "0",
        partner_fee_total_usd: "0",
        commission_total_usd: "0",
        net_total_usd: "0",
        status: "pending",
        paid_at: null,
        failure_reason: null,
        external_transfer_ref: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    it("aggregates totals and writes items", async () => {
      repo.findCapturedInPeriod.mockResolvedValue([
        row({
          payment_id: "p1",
          gross_amount_usd: "100",
          commission_amount_usd: "20",
          net_payout_usd: "80",
          tax_amount_usd: "19",
        }),
        row({
          payment_id: "p2",
          gross_amount_usd: "50",
          commission_amount_usd: "10",
          net_payout_usd: "40",
          tax_amount_usd: "9.5",
        }),
      ]);

      const res = await service.getByPartnerAndMonth("partner-1", pastMonth());

      expect(repo.upsertHeader).toHaveBeenCalled();
      expect(repo.writeItemsAndTotals).toHaveBeenCalledWith(
        "disb-1",
        expect.arrayContaining([
          expect.objectContaining({ payment_id: "p1" }),
          expect.objectContaining({ payment_id: "p2" }),
        ]),
        expect.objectContaining({
          grossTotal: 150,
          commissionTotal: 30,
          netTotal: 120,
          taxTotal: 28.5,
        }),
      );
      expect(res.totals.gross).toBe(150);
      expect(res.totals.net).toBe(120);
      expect(res.paymentCount).toBe(2);
    });

    it("rolls up payments by property", async () => {
      repo.findCapturedInPeriod.mockResolvedValue([
        row({
          payment_id: "p1",
          property_id: "prop-A",
          property_name: "Hotel A",
          net_payout_usd: "80",
        }),
        row({
          payment_id: "p2",
          property_id: "prop-A",
          property_name: "Hotel A",
          net_payout_usd: "40",
        }),
        row({
          payment_id: "p3",
          property_id: "prop-B",
          property_name: "Hotel B",
          net_payout_usd: "60",
        }),
      ]);

      const res = await service.getByPartnerAndMonth("partner-1", pastMonth());

      expect(res.byProperty).toHaveLength(2);
      expect(res.byProperty[0]).toMatchObject({
        propertyId: "prop-A",
        net: 120, // sorted by net desc
        paymentCount: 2,
      });
      expect(res.byProperty[1]).toMatchObject({
        propertyId: "prop-B",
        net: 60,
        paymentCount: 1,
      });
    });

    it("returns empty rollup when no captures in the period", async () => {
      repo.findCapturedInPeriod.mockResolvedValue([]);

      const res = await service.getByPartnerAndMonth("partner-1", pastMonth());

      expect(res.byProperty).toEqual([]);
      expect(res.totals.net).toBe(0);
      expect(res.paymentCount).toBe(0);
    });
  });

  describe("current month — projects on the fly", () => {
    it("does not call upsertHeader or writeItemsAndTotals", async () => {
      repo.findCapturedInPeriod.mockResolvedValue([row()]);

      const res = await service.getByPartnerAndMonth(
        "partner-1",
        currentMonth(),
      );

      expect(repo.upsertHeader).not.toHaveBeenCalled();
      expect(repo.writeItemsAndTotals).not.toHaveBeenCalled();
      expect(res.status).toBe("projected");
    });

    it("still rolls up by property", async () => {
      repo.findCapturedInPeriod.mockResolvedValue([
        row({ property_id: "prop-A", net_payout_usd: "80" }),
        row({ property_id: "prop-B", net_payout_usd: "30" }),
      ]);

      const res = await service.getByPartnerAndMonth(
        "partner-1",
        currentMonth(),
      );

      expect(res.byProperty).toHaveLength(2);
      expect(res.totals.net).toBe(110);
    });
  });

  it("rejects malformed month strings indirectly via downstream parse", async () => {
    // Service throws via monthBounds when parts are non-numeric.
    await expect(
      service.getByPartnerAndMonth("partner-1", "not-a-month"),
    ).rejects.toThrow();
  });
});
