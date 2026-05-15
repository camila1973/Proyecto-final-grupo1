import { DisbursementsService } from "./disbursements.service.js";
import {
  CapturedPaymentForHistory,
  CapturedPaymentForPeriod,
} from "./disbursements.repository.js";

function makeRepo() {
  return {
    findCapturedInPeriod: jest.fn<Promise<CapturedPaymentForPeriod[]>, any[]>(),
    findCapturedInRange: jest.fn<Promise<CapturedPaymentForHistory[]>, any[]>(),
    findManyByPartnerAndRange: jest.fn().mockResolvedValue([]),
    upsertHeader: jest.fn(),
    writeItemsAndTotals: jest.fn().mockResolvedValue(undefined),
    findByPeriod: jest.fn(),
  };
}

function historyRow(
  overrides: Partial<CapturedPaymentForHistory> = {},
): CapturedPaymentForHistory {
  return {
    payment_id: "pay-1",
    property_id: "prop-1",
    property_name: "Hotel A",
    captured_at: new Date("2026-03-15T10:00:00.000Z"),
    gross_amount_usd: "100.00",
    tax_amount_usd: "19.00",
    partner_fee_usd: "5.00",
    commission_amount_usd: "20.00",
    net_payout_usd: "80.00",
    ...overrides,
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

  describe("getHistory", () => {
    it("rejects bad date formats", async () => {
      await expect(
        service.getHistory("partner-1", "bad", "2026-05-01"),
      ).rejects.toThrow(/from/);
      await expect(
        service.getHistory("partner-1", "2026-01-01", "bad"),
      ).rejects.toThrow(/to/);
    });

    it("rejects ranges over 366 days", async () => {
      await expect(
        service.getHistory("partner-1", "2024-01-01", "2026-01-01"),
      ).rejects.toThrow(/366/);
    });

    it("rejects to <= from", async () => {
      await expect(
        service.getHistory("partner-1", "2026-05-01", "2026-04-01"),
      ).rejects.toThrow(/after/);
    });

    it("rejects invalid propertyId", async () => {
      await expect(
        service.getHistory(
          "partner-1",
          "2026-01-01",
          "2026-05-01",
          "not-a-uuid",
        ),
      ).rejects.toThrow(/propertyId/);
    });

    it("groups captured rows by month and rolls up by property", async () => {
      repo.findCapturedInRange.mockResolvedValue([
        historyRow({
          payment_id: "p1",
          property_id: "prop-A",
          property_name: "Hotel A",
          captured_at: new Date("2026-03-10T12:00:00Z"),
          gross_amount_usd: "1000",
          tax_amount_usd: "190",
          commission_amount_usd: "200",
          net_payout_usd: "800",
        }),
        historyRow({
          payment_id: "p2",
          property_id: "prop-A",
          property_name: "Hotel A",
          captured_at: new Date("2026-03-20T12:00:00Z"),
          gross_amount_usd: "500",
          tax_amount_usd: "95",
          commission_amount_usd: "100",
          net_payout_usd: "400",
        }),
        historyRow({
          payment_id: "p3",
          property_id: "prop-B",
          property_name: "Hotel B",
          captured_at: new Date("2026-04-05T12:00:00Z"),
          gross_amount_usd: "300",
          tax_amount_usd: "57",
          commission_amount_usd: "60",
          net_payout_usd: "240",
        }),
      ]);

      const res = await service.getHistory(
        "partner-1",
        "2026-03-01",
        "2026-05-01",
      );

      expect(res.months).toHaveLength(2);
      expect(res.months[0]).toMatchObject({
        month: "2026-03",
        periodStart: "2026-03-01",
        periodEnd: "2026-04-01",
        paymentCount: 2,
      });
      expect(res.months[0].totals.gross).toBe(1500);
      expect(res.months[0].byProperty).toHaveLength(1);
      expect(res.months[0].byProperty[0]).toMatchObject({
        propertyId: "prop-A",
        net: 1200,
      });
      expect(res.months[1].month).toBe("2026-04");
      expect(res.months[1].totals.net).toBe(240);
      expect(res.totals.gross).toBe(1800);
      expect(res.paymentCount).toBe(3);
    });

    it("inherits status/paidAt from materialized headers when present", async () => {
      repo.findCapturedInRange.mockResolvedValue([
        historyRow({
          captured_at: new Date("2026-02-10T12:00:00Z"),
          property_id: "prop-A",
          gross_amount_usd: "100",
          net_payout_usd: "80",
        }),
      ]);
      repo.findManyByPartnerAndRange.mockResolvedValue([
        {
          id: "disb-1",
          partner_id: "partner-1",
          period_start: "2026-02-01",
          period_end: "2026-03-01",
          scheduled_for: "2026-03-01",
          status: "paid",
          paid_at: new Date("2026-03-05T10:00:00Z"),
          external_transfer_ref: "TR-123",
          currency: "USD",
        },
      ]);

      const res = await service.getHistory(
        "partner-1",
        "2026-02-01",
        "2026-03-01",
      );
      expect(res.months[0].status).toBe("paid");
      expect(res.months[0].paidAt).toBe("2026-03-05T10:00:00.000Z");
      expect(res.months[0].externalTransferRef).toBe("TR-123");
    });

    it("defaults status to 'pending' for past months without a header", async () => {
      repo.findCapturedInRange.mockResolvedValue([
        historyRow({
          captured_at: new Date("2025-06-10T12:00:00Z"),
          gross_amount_usd: "100",
          net_payout_usd: "80",
        }),
      ]);
      const res = await service.getHistory(
        "partner-1",
        "2025-06-01",
        "2025-07-01",
      );
      expect(res.months[0].status).toBe("pending");
    });

    it("returns empty months and zero totals for periods with no captures", async () => {
      repo.findCapturedInRange.mockResolvedValue([]);
      const res = await service.getHistory(
        "partner-1",
        "2026-01-01",
        "2026-04-01",
      );
      expect(res.months).toHaveLength(0);
      expect(res.totals).toEqual({
        gross: 0,
        tax: 0,
        partnerFee: 0,
        commission: 0,
        net: 0,
      });
      expect(res.paymentCount).toBe(0);
    });

    it("forwards propertyId filter to the repository", async () => {
      repo.findCapturedInRange.mockResolvedValue([]);
      await service.getHistory(
        "partner-1",
        "2026-01-01",
        "2026-02-01",
        "10000000-0000-4000-8000-000000000001",
      );
      expect(repo.findCapturedInRange).toHaveBeenCalledWith(
        "partner-1",
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-02-01T00:00:00.000Z"),
        "10000000-0000-4000-8000-000000000001",
      );
    });
  });
});
