// Mock pdfkit before importing the renderer so PDF generation is testable
// without writing real binaries.
const mockDocInstance: Record<string, jest.Mock> & {
  _pageHandler?: () => void;
} = {
  image: jest.fn().mockReturnThis(),
  font: jest.fn().mockReturnThis(),
  fontSize: jest.fn().mockReturnThis(),
  fillColor: jest.fn().mockReturnThis(),
  strokeColor: jest.fn().mockReturnThis(),
  lineWidth: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  moveTo: jest.fn().mockReturnThis(),
  lineTo: jest.fn().mockReturnThis(),
  stroke: jest.fn().mockReturnThis(),
  rect: jest.fn().mockReturnThis(),
  fill: jest.fn().mockReturnThis(),
  save: jest.fn().mockReturnThis(),
  restore: jest.fn().mockReturnThis(),
  roundedRect: jest.fn().mockReturnThis(),
  pipe: jest.fn(),
  addPage: jest.fn(),
  on: jest.fn(),
  bufferedPageRange: jest.fn().mockReturnValue({ start: 0, count: 1 }),
  switchToPage: jest.fn(),
  end: jest.fn(),
};

jest.mock("pdfkit", () => jest.fn().mockImplementation(() => mockDocInstance));

// Mock fs so loadLogo never reads from disk
const mockReadFileSync = jest.fn(() => {
  throw new Error("logo missing in test environment");
});
jest.mock("fs", () => ({
  readFileSync: mockReadFileSync,
}));

import {
  PaymentsPdfRenderer,
  reportFilename,
} from "./payments-pdf.renderer.js";
import type { ReportData, ReportLocale } from "./exports.types.js";

interface MockRes {
  setHeader: jest.Mock;
  write: jest.Mock;
  end: jest.Mock;
}

function makeRes(): MockRes {
  return {
    setHeader: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  };
}

// Helper for rendering that accepts our MockRes via a single cast site.
function callRender(
  renderer: PaymentsPdfRenderer,
  data: ReportData,
  locale: ReportLocale,
  res: MockRes,
): void {
  renderer.render(data, locale, res as unknown as import("express").Response);
}

function makeReportData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    header: {
      partnerId: "p-1",
      partnerName: "Hotel Alpha",
      propertyId: null,
      propertyName: null,
      from: "2026-03-01",
      to: "2026-04-01",
      generatedAt: "2026-04-02T10:00:00.000Z",
      currency: "USD",
    },
    totals: {
      grossUsd: 1190,
      taxUsd: 190,
      commissionUsd: 238,
      netUsd: 952,
      count: 1,
    },
    rows: [
      {
        reservationId: "res-abcd1234efgh",
        propertyId: "prop-1",
        propertyName: "Hotel Alpha",
        status: "captured",
        paymentMethod: "STRIPE",
        reference: "pi_123",
        nights: 2,
        ratePerNightUsd: 500,
        subtotalUsd: 1000,
        taxesUsd: 190,
        totalPaidUsd: 1190,
        commissionUsd: -238,
        earningsUsd: 952,
        createdAt: "2026-03-05T10:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

function collectText(): string {
  const calls = mockDocInstance.text.mock.calls as unknown as unknown[][];
  return calls.map((args) => String(args[0])).join("|");
}

function getAddPageCount(): number {
  return mockDocInstance.addPage.mock.calls.length;
}

function getTextCallCount(): number {
  return mockDocInstance.text.mock.calls.length;
}

describe("PaymentsPdfRenderer", () => {
  let renderer: PaymentsPdfRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFileSync.mockImplementation(() => {
      throw new Error("logo missing in test environment");
    });
    mockDocInstance.on.mockImplementation(
      (event: string, handler: () => void) => {
        if (event === "pageAdded") {
          mockDocInstance._pageHandler = handler;
        }
        return mockDocInstance;
      },
    );
    mockDocInstance.bufferedPageRange.mockReturnValue({ start: 0, count: 1 });
    renderer = new PaymentsPdfRenderer();
  });

  it("sets Content-Type and Content-Disposition headers", () => {
    const res = makeRes();
    callRender(renderer, makeReportData(), "es", res);
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/pdf",
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringMatching(/^attachment; filename="travelhub-.*\.pdf"$/),
    );
  });

  it("renders rows when present", () => {
    const res = makeRes();
    callRender(renderer, makeReportData(), "es", res);
    expect(mockDocInstance.pipe).toHaveBeenCalledWith(res);
    expect(mockDocInstance.addPage).toHaveBeenCalled();
    expect(mockDocInstance.end).toHaveBeenCalled();
  });

  it("renders empty-state when rows is empty", () => {
    const res = makeRes();
    callRender(renderer, makeReportData({ rows: [] }), "es", res);
    expect(collectText()).toContain("Sin pagos");
  });

  it("uses 'en' locale strings", () => {
    const res = makeRes();
    callRender(renderer, makeReportData({ rows: [] }), "en", res);
    expect(collectText()).toContain("No payments");
  });

  it("uses COLUMNS_NO_PROPERTY when propertyId is set", () => {
    const res = makeRes();
    const base = makeReportData();
    const data: ReportData = {
      ...base,
      header: {
        ...base.header,
        propertyId: "prop-1",
        propertyName: "Hotel Alpha",
      },
    };
    callRender(renderer, data, "es" as ReportLocale, res);
    expect(collectText()).toContain("Hotel Alpha");
  });

  it("triggers page break when rows exceed page height", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      reservationId: `res-${i}-padded`,
      propertyId: "prop-1",
      propertyName: "Hotel Alpha",
      status: "captured",
      paymentMethod: "STRIPE",
      reference: `pi_${i}`,
      nights: 2,
      ratePerNightUsd: 100,
      subtotalUsd: 200,
      taxesUsd: 38,
      totalPaidUsd: 238,
      commissionUsd: -47.6,
      earningsUsd: 190.4,
      createdAt: "2026-03-05T10:00:00.000Z",
    }));
    const res = makeRes();
    callRender(renderer, makeReportData({ rows }), "es", res);
    expect(getAddPageCount()).toBeGreaterThan(1);
  });

  it("executes the pageAdded handler when a page is added", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      reservationId: `res-${i}-padded`,
      propertyId: "prop-1",
      propertyName: "Hotel Alpha",
      status: "captured",
      paymentMethod: "STRIPE",
      reference: `pi_${i}`,
      nights: 2,
      ratePerNightUsd: 100,
      subtotalUsd: 200,
      taxesUsd: 38,
      totalPaidUsd: 238,
      commissionUsd: -47.6,
      earningsUsd: 190.4,
      createdAt: "2026-03-05T10:00:00.000Z",
    }));
    mockDocInstance.on.mockImplementation(
      (event: string, handler: () => void) => {
        if (event === "pageAdded") {
          mockDocInstance._pageHandler = handler;
        }
        return mockDocInstance;
      },
    );
    mockDocInstance.addPage.mockImplementation(() => {
      mockDocInstance._pageHandler?.();
    });

    const res = makeRes();
    callRender(renderer, makeReportData({ rows }), "es", res);
    expect(getTextCallCount()).toBeGreaterThan(20);
  });

  it("renders multi-page footer with page numbers", () => {
    mockDocInstance.bufferedPageRange.mockReturnValue({ start: 0, count: 3 });
    const res = makeRes();
    callRender(renderer, makeReportData({ rows: [] }), "es", res);
    expect(mockDocInstance.switchToPage).toHaveBeenCalledTimes(3);
    expect(mockDocInstance.switchToPage).toHaveBeenCalledWith(0);
    expect(mockDocInstance.switchToPage).toHaveBeenCalledWith(2);
  });

  it("formats negative numbers with a leading minus", () => {
    const base = makeReportData();
    const data: ReportData = {
      ...base,
      rows: [
        {
          ...base.rows[0],
          earningsUsd: -100,
          commissionUsd: -50,
        },
      ],
    };
    const res = makeRes();
    callRender(renderer, data, "es", res);
    expect(collectText()).toMatch(/-\$/);
  });

  it("draws the logo when fs.readFileSync returns a buffer", () => {
    mockReadFileSync.mockReturnValueOnce(Buffer.from([0, 1, 2, 3]) as never);
    const res = makeRes();
    callRender(renderer, makeReportData(), "es", res);
    expect(mockDocInstance.image).toHaveBeenCalled();
  });

  it("recovers when doc.image throws", () => {
    mockReadFileSync.mockReturnValueOnce(Buffer.from([0, 1, 2, 3]) as never);
    mockDocInstance.image.mockImplementationOnce(() => {
      throw new Error("bad image");
    });
    const res = makeRes();
    expect(() =>
      callRender(renderer, makeReportData(), "es", res),
    ).not.toThrow();
  });
});

describe("reportFilename", () => {
  it("uses propertyName when propertyId is set", () => {
    const name = reportFilename(
      {
        header: {
          partnerId: "p1",
          partnerName: "Partner X",
          propertyId: "prop-1",
          propertyName: "Hotel Las Brisas",
          from: "2026-03-01",
          to: "2026-04-01",
          generatedAt: "2026-04-02T10:00:00.000Z",
          currency: "USD",
        },
        totals: {
          grossUsd: 0,
          taxUsd: 0,
          commissionUsd: 0,
          netUsd: 0,
          count: 0,
        },
        rows: [],
      },
      "pdf",
    );
    expect(name).toBe("travelhub-hotel-las-brisas-2026-03-01_2026-04-01.pdf");
  });

  it("falls back to propertyId when propertyName is empty", () => {
    const name = reportFilename(
      {
        header: {
          partnerId: "p1",
          partnerName: "Partner X",
          propertyId: "prop-1",
          propertyName: "",
          from: "2026-03-01",
          to: "2026-04-01",
          generatedAt: "2026-04-02T10:00:00.000Z",
          currency: "USD",
        },
        totals: {
          grossUsd: 0,
          taxUsd: 0,
          commissionUsd: 0,
          netUsd: 0,
          count: 0,
        },
        rows: [],
      },
      "csv",
    );
    expect(name).toMatch(/prop-1/);
    expect(name).toMatch(/\.csv$/);
  });

  it("uses partnerName when no propertyId", () => {
    const name = reportFilename(
      {
        header: {
          partnerId: "p1",
          partnerName: "Hotel Group",
          propertyId: null,
          propertyName: null,
          from: "2026-03-01",
          to: "2026-04-01",
          generatedAt: "2026-04-02T10:00:00.000Z",
          currency: "USD",
        },
        totals: {
          grossUsd: 0,
          taxUsd: 0,
          commissionUsd: 0,
          netUsd: 0,
          count: 0,
        },
        rows: [],
      },
      "pdf",
    );
    expect(name).toBe("travelhub-hotel-group-2026-03-01_2026-04-01.pdf");
  });

  it("defaults to 'partner' when partnerName is empty", () => {
    const name = reportFilename(
      {
        header: {
          partnerId: "p1",
          partnerName: "",
          propertyId: null,
          propertyName: null,
          from: "2026-03-01",
          to: "2026-04-01",
          generatedAt: "2026-04-02T10:00:00.000Z",
          currency: "USD",
        },
        totals: {
          grossUsd: 0,
          taxUsd: 0,
          commissionUsd: 0,
          netUsd: 0,
          count: 0,
        },
        rows: [],
      },
      "pdf",
    );
    expect(name).toMatch(/partner/);
  });
});
