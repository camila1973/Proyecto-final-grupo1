import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PartnersController } from "./partners.controller.js";
import { PartnersService } from "./partners.service.js";
import { ExportsService } from "../exports/exports.service.js";
import { PaymentsPdfRenderer } from "../exports/payments-pdf.renderer.js";
import { PaymentsCsvRenderer } from "../exports/payments-csv.renderer.js";
import { DisbursementPdfRenderer } from "../exports/disbursement-pdf.renderer.js";
import { DisbursementCsvRenderer } from "../exports/disbursement-csv.renderer.js";

function makeRes() {
  return {
    setHeader: jest.fn(),
    end: jest.fn(),
  } as unknown as import("express").Response;
}

describe("PartnersController (dashboard)", () => {
  let controller: PartnersController;
  let getPartnerMetrics: jest.Mock;
  let getPayments: jest.Mock;
  let getDisbursementHistory: jest.Mock;
  let loadReportData: jest.Mock;
  let loadDisbursementReportData: jest.Mock;
  let renderPaymentsPdf: jest.Mock;
  let renderPaymentsCsv: jest.Mock;
  let renderDisbursementPdf: jest.Mock;
  let renderDisbursementCsv: jest.Mock;

  beforeEach(async () => {
    getPartnerMetrics = jest.fn().mockResolvedValue("partner-metrics");
    getPayments = jest.fn().mockResolvedValue("payments");
    getDisbursementHistory = jest.fn().mockResolvedValue("history");
    loadReportData = jest.fn().mockResolvedValue({ payments: true });
    loadDisbursementReportData = jest
      .fn()
      .mockResolvedValue({ disbursement: true });
    renderPaymentsPdf = jest.fn();
    renderPaymentsCsv = jest.fn().mockResolvedValue(undefined);
    renderDisbursementPdf = jest.fn();
    renderDisbursementCsv = jest.fn().mockResolvedValue(undefined);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PartnersController],
      providers: [
        {
          provide: PartnersService,
          useValue: {
            getPartnerMetrics,
            getPayments,
            getDisbursementHistory,
          },
        },
        {
          provide: ExportsService,
          useValue: { loadReportData, loadDisbursementReportData },
        },
        {
          provide: PaymentsPdfRenderer,
          useValue: { render: renderPaymentsPdf },
        },
        {
          provide: PaymentsCsvRenderer,
          useValue: { render: renderPaymentsCsv },
        },
        {
          provide: DisbursementPdfRenderer,
          useValue: { render: renderDisbursementPdf },
        },
        {
          provide: DisbursementCsvRenderer,
          useValue: { render: renderDisbursementCsv },
        },
      ],
    }).compile();
    controller = moduleRef.get(PartnersController);
  });

  describe("partnerMetrics", () => {
    it("delegates with partnerId, month, and roomType", async () => {
      await controller.partnerMetrics("p1", "2026-03", "Suite");
      expect(getPartnerMetrics).toHaveBeenCalledWith("p1", "2026-03", "Suite");
    });

    it("falls back to current month when month is invalid", async () => {
      await controller.partnerMetrics("p1", "not-a-month", undefined);
      const call = getPartnerMetrics.mock.calls[0] as [
        string,
        string,
        string | null,
      ];
      expect(call[1]).toMatch(/^\d{4}-\d{2}$/);
      expect(call[2]).toBeNull();
    });

    it("treats blank roomType as null", async () => {
      await controller.partnerMetrics("p1", "2026-03", "   ");
      expect(getPartnerMetrics).toHaveBeenCalledWith("p1", "2026-03", null);
    });
  });

  describe("propertyPayments (JSON)", () => {
    it("clamps page and pageSize and resolves month → range", async () => {
      await controller.propertyPayments(
        "p1",
        "prop-xyz",
        "2026-03",
        undefined,
        undefined,
        "0",
        "9999",
      );
      expect(getPayments).toHaveBeenCalledWith(
        "p1",
        "prop-xyz",
        "2026-03-01",
        "2026-04-01",
        1,
        100,
      );
    });

    it("defaults to current month when no range given", async () => {
      await controller.propertyPayments("p1", "prop-xyz");
      const call = getPayments.mock.calls[0] as [
        string,
        string,
        string,
        string,
        number,
        number,
      ];
      expect(call[0]).toBe("p1");
      expect(call[1]).toBe("prop-xyz");
      expect(call[2]).toMatch(/^\d{4}-\d{2}-01$/);
      expect(call[3]).toMatch(/^\d{4}-\d{2}-01$/);
      expect(call[4]).toBe(1);
      expect(call[5]).toBe(20);
    });

    it("honors explicit from/to when month is invalid", async () => {
      await controller.propertyPayments(
        "p1",
        "prop-xyz",
        "junk",
        "2026-02-01",
        "2026-03-01",
        "2",
        "10",
      );
      expect(getPayments).toHaveBeenCalledWith(
        "p1",
        "prop-xyz",
        "2026-02-01",
        "2026-03-01",
        2,
        10,
      );
    });
  });

  describe("propertyPayments (format)", () => {
    it("renders PDF when format=pdf", async () => {
      const res = makeRes();
      await controller.propertyPayments(
        "p1",
        "prop-xyz",
        undefined,
        "2026-03-01",
        "2026-04-01",
        undefined,
        undefined,
        "pdf",
        "en",
        "p1",
        res,
      );
      expect(loadReportData).toHaveBeenCalledWith(
        "p1",
        "2026-03-01",
        "2026-04-01",
        "prop-xyz",
      );
      expect(renderPaymentsPdf).toHaveBeenCalledWith(
        { payments: true },
        "en",
        res,
      );
    });

    it("renders CSV when format=csv", async () => {
      const res = makeRes();
      await controller.propertyPayments(
        "p1",
        "prop-xyz",
        "2026-03",
        undefined,
        undefined,
        undefined,
        undefined,
        "csv",
        undefined,
        "p1",
        res,
      );
      expect(loadReportData).toHaveBeenCalledWith(
        "p1",
        "2026-03-01",
        "2026-04-01",
        "prop-xyz",
      );
      expect(renderPaymentsCsv).toHaveBeenCalled();
    });

    it("rejects unsupported format with 400", async () => {
      await expect(
        controller.propertyPayments(
          "p1",
          "prop-xyz",
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          "xlsx",
          undefined,
          "p1",
          makeRes(),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects mismatched x-partner-id with 403", async () => {
      await expect(
        controller.propertyPayments(
          "p1",
          "prop-xyz",
          undefined,
          "2026-03-01",
          "2026-04-01",
          undefined,
          undefined,
          "pdf",
          undefined,
          "p2",
          makeRes(),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("partnerPayments (no propertyId)", () => {
    it("delegates JSON with propertyId=null over the resolved range", async () => {
      await controller.partnerPayments("p1");
      const call = getPayments.mock.calls[0] as [
        string,
        string | null,
        string,
        string,
        number,
        number,
      ];
      expect(call[0]).toBe("p1");
      expect(call[1]).toBeNull();
      expect(call[2]).toMatch(/^\d{4}-\d{2}-01$/);
      expect(call[3]).toMatch(/^\d{4}-\d{2}-01$/);
      expect(call[4]).toBe(1);
      expect(call[5]).toBe(20);
    });

    it("renders PDF over the partner-wide range", async () => {
      const res = makeRes();
      await controller.partnerPayments(
        "p1",
        undefined,
        "2026-01-01",
        "2026-04-01",
        undefined,
        undefined,
        "pdf",
        undefined,
        "p1",
        res,
      );
      expect(loadReportData).toHaveBeenCalledWith(
        "p1",
        "2026-01-01",
        "2026-04-01",
        null,
      );
      expect(renderPaymentsPdf).toHaveBeenCalled();
    });
  });

  describe("disbursements", () => {
    it("returns history JSON when no format", async () => {
      await controller.disbursements(
        "p1",
        undefined,
        "2026-01-01",
        "2027-01-01",
      );
      expect(getDisbursementHistory).toHaveBeenCalledWith(
        "p1",
        "2026-01-01",
        "2027-01-01",
        null,
      );
    });

    it("derives one-month range from `month` shorthand", async () => {
      await controller.disbursements("p1", "2026-03");
      expect(getDisbursementHistory).toHaveBeenCalledWith(
        "p1",
        "2026-03-01",
        "2026-04-01",
        null,
      );
    });

    it("renders PDF report with format=pdf", async () => {
      const res = makeRes();
      await controller.disbursements(
        "p1",
        undefined,
        "2026-01-01",
        "2027-01-01",
        undefined,
        "pdf",
        "es",
        "p1",
        res,
      );
      expect(loadDisbursementReportData).toHaveBeenCalledWith(
        "p1",
        "2026-01-01",
        "2027-01-01",
        null,
      );
      expect(renderDisbursementPdf).toHaveBeenCalledWith(
        { disbursement: true },
        "es",
        res,
      );
    });

    it("rejects mismatched x-partner-id when format set", async () => {
      await expect(
        controller.disbursements(
          "p1",
          undefined,
          "2026-01-01",
          "2027-01-01",
          undefined,
          "pdf",
          undefined,
          "p2",
          makeRes(),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
