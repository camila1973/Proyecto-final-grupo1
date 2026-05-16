import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ExportsService } from "./exports.service.js";

function makePaymentClient(rows: unknown[] = [], totals: unknown = null) {
  return {
    getCapturedByPartner: jest.fn().mockResolvedValue({
      partnerId: "p-1",
      from: "2026-04-01",
      to: "2026-05-01",
      currency: "USD",
      totals: totals ?? {
        grossUsd: 0,
        taxUsd: 0,
        commissionUsd: 0,
        netUsd: 0,
        count: 0,
      },
      rows,
    }),
  };
}

function makePartnersRepo(name = "Hotel Alpha") {
  return {
    findById: jest.fn().mockResolvedValue({ id: "p-1", name }),
  };
}

describe("ExportsService", () => {
  it("rejects invalid date formats with 400", async () => {
    const svc = new ExportsService(
      makePaymentClient() as any,
      makePartnersRepo() as any,
    );
    await expect(
      svc.loadReportData("p-1", "bad", "2026-05-01", null),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.loadReportData("p-1", "2026-04-01", "bad", null),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects to <= from", async () => {
    const svc = new ExportsService(
      makePaymentClient() as any,
      makePartnersRepo() as any,
    );
    await expect(
      svc.loadReportData("p-1", "2026-05-01", "2026-04-01", null),
    ).rejects.toThrow(/after/);
  });

  it("rejects ranges over 366 days", async () => {
    const svc = new ExportsService(
      makePaymentClient() as any,
      makePartnersRepo() as any,
    );
    await expect(
      svc.loadReportData("p-1", "2024-01-01", "2026-01-01", null),
    ).rejects.toThrow(/366/);
  });

  it("throws ServiceUnavailable if payment-service is down", async () => {
    const client = {
      getCapturedByPartner: jest.fn().mockResolvedValue(null),
    };
    const svc = new ExportsService(client as any, makePartnersRepo() as any);
    await expect(
      svc.loadReportData("p-1", "2026-04-01", "2026-05-01", null),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("maps captured rows to PaymentRow with snapshot data", async () => {
    const client = makePaymentClient(
      [
        {
          paymentId: "pay-1",
          reservationId: "res-1",
          propertyId: "prop-1",
          propertyName: "Hotel Alpha",
          status: "captured",
          stripePaymentIntentId: "pi_abc",
          grossAmountUsd: 1190,
          taxAmountUsd: 190,
          commissionRate: 0.2,
          commissionAmountUsd: 238,
          netPayoutUsd: 952,
          capturedAt: "2026-04-05T12:00:00.000Z",
          createdAt: "2026-04-05T11:00:00.000Z",
          fareSnapshot: { nights: 2, roomRateUsd: 500 },
        },
      ],
      {
        grossUsd: 1190,
        taxUsd: 190,
        commissionUsd: 238,
        netUsd: 952,
        count: 1,
      },
    );
    const svc = new ExportsService(client as any, makePartnersRepo() as any);
    const data = await svc.loadReportData(
      "p-1",
      "2026-04-01",
      "2026-05-01",
      "prop-1",
    );
    expect(data.header.partnerName).toBe("Hotel Alpha");
    expect(data.header.propertyId).toBe("prop-1");
    expect(data.header.propertyName).toBe("Hotel Alpha");
    expect(data.totals).toEqual({
      grossUsd: 1190,
      taxUsd: 190,
      commissionUsd: 238,
      netUsd: 952,
      count: 1,
    });
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0]).toMatchObject({
      reservationId: "res-1",
      nights: 2,
      totalPaidUsd: 1190,
      taxesUsd: 190,
      commissionUsd: -238,
      earningsUsd: 952,
    });
  });

  it("returns empty rows + zero totals for periods with no payments", async () => {
    const svc = new ExportsService(
      makePaymentClient([]) as any,
      makePartnersRepo() as any,
    );
    const data = await svc.loadReportData(
      "p-1",
      "2026-04-01",
      "2026-05-01",
      null,
    );
    expect(data.rows).toHaveLength(0);
    expect(data.totals.count).toBe(0);
    expect(data.header.propertyName).toBeNull();
  });

  it("rejects unparseable date strings", async () => {
    const svc = new ExportsService(
      makePaymentClient() as any,
      makePartnersRepo() as any,
    );
    // Format-valid but actual Date.parse returns NaN for invalid month 13
    await expect(
      svc.loadReportData("p-1", "2026-13-01", "2026-05-01", null),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("ExportsService.loadDisbursementReportData", () => {
  function makePaymentClient(history: unknown) {
    return {
      getDisbursementHistory: jest.fn().mockResolvedValue(history),
    };
  }
  function makePartnersRepo(name = "Hotel Alpha") {
    return {
      findById: jest.fn().mockResolvedValue({ id: "p-1", name }),
    };
  }

  const VALID_HISTORY = {
    partnerId: "p-1",
    from: "2026-03-01",
    to: "2026-04-01",
    currency: "USD",
    totals: { gross: 0, tax: 0, partnerFee: 0, commission: 0, net: 0 },
    paymentCount: 0,
    months: [
      {
        month: "2026-03",
        periodStart: "2026-03-01",
        periodEnd: "2026-04-01",
        scheduledFor: "2026-04-15",
        status: "paid",
        paidAt: "2026-04-15",
        externalTransferRef: null,
        totals: { gross: 0, tax: 0, partnerFee: 0, commission: 0, net: 0 },
        byProperty: [
          { propertyId: "prop-1", propertyName: "Hotel Las Brisas" },
        ],
        paymentCount: 0,
      },
    ],
  };

  it("rejects invalid date formats with 400", async () => {
    const svc = new ExportsService(
      makePaymentClient(VALID_HISTORY) as any,
      makePartnersRepo() as any,
    );
    await expect(
      svc.loadDisbursementReportData("p-1", "bad", "2026-04-01", null),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      svc.loadDisbursementReportData("p-1", "2026-03-01", "bad", null),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects to <= from", async () => {
    const svc = new ExportsService(
      makePaymentClient(VALID_HISTORY) as any,
      makePartnersRepo() as any,
    );
    await expect(
      svc.loadDisbursementReportData("p-1", "2026-05-01", "2026-04-01", null),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects ranges over 366 days", async () => {
    const svc = new ExportsService(
      makePaymentClient(VALID_HISTORY) as any,
      makePartnersRepo() as any,
    );
    await expect(
      svc.loadDisbursementReportData("p-1", "2024-01-01", "2026-01-01", null),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects unparseable dates", async () => {
    const svc = new ExportsService(
      makePaymentClient(VALID_HISTORY) as any,
      makePartnersRepo() as any,
    );
    await expect(
      svc.loadDisbursementReportData("p-1", "2026-13-01", "2026-04-01", null),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws ServiceUnavailable when payment-service returns null", async () => {
    const svc = new ExportsService(
      makePaymentClient(null) as any,
      makePartnersRepo() as any,
    );
    await expect(
      svc.loadDisbursementReportData("p-1", "2026-03-01", "2026-04-01", null),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("resolves and looks up propertyName from history months when propertyId given", async () => {
    const svc = new ExportsService(
      makePaymentClient(VALID_HISTORY) as any,
      makePartnersRepo() as any,
    );
    const data = await svc.loadDisbursementReportData(
      "p-1",
      "2026-03-01",
      "2026-04-01",
      "prop-1",
    );
    expect(data.header.partnerName).toBe("Hotel Alpha");
    expect(data.header.propertyId).toBe("prop-1");
    expect(data.header.propertyName).toBe("Hotel Las Brisas");
    expect(data.months).toHaveLength(1);
  });

  it("uses null propertyName when propertyId not found in history", async () => {
    const svc = new ExportsService(
      makePaymentClient(VALID_HISTORY) as any,
      makePartnersRepo() as any,
    );
    const data = await svc.loadDisbursementReportData(
      "p-1",
      "2026-03-01",
      "2026-04-01",
      "prop-MISSING",
    );
    expect(data.header.propertyName).toBeNull();
  });

  it("uses null propertyName when propertyId is null", async () => {
    const svc = new ExportsService(
      makePaymentClient(VALID_HISTORY) as any,
      makePartnersRepo() as any,
    );
    const data = await svc.loadDisbursementReportData(
      "p-1",
      "2026-03-01",
      "2026-04-01",
      null,
    );
    expect(data.header.propertyName).toBeNull();
  });
});
