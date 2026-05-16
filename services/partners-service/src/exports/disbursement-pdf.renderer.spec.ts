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

const mockReadFileSync = jest.fn(() => {
  throw new Error("logo missing in test environment");
});
jest.mock("fs", () => ({
  readFileSync: mockReadFileSync,
}));

import {
  DisbursementPdfRenderer,
  disbursementFilename,
} from "./disbursement-pdf.renderer.js";
import type { DisbursementReportData } from "./exports.types.js";
import type { DisbursementMonthDto } from "../partners/dashboard.types.js";

function collectText(): string {
  const calls = mockDocInstance.text.mock.calls as unknown as unknown[][];
  return calls.map((args) => String(args[0])).join("|");
}

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

function callRender(
  renderer: DisbursementPdfRenderer,
  data: DisbursementReportData,
  locale: "es" | "en",
  res: MockRes,
): void {
  renderer.render(data, locale, res as unknown as import("express").Response);
}

function month(
  overrides: Partial<DisbursementMonthDto> = {},
): DisbursementMonthDto {
  return {
    month: "2026-03",
    periodStart: "2026-03-01",
    periodEnd: "2026-04-01",
    scheduledFor: "2026-04-15",
    status: "pending",
    paidAt: null,
    externalTransferRef: null,
    totals: {
      gross: 1190,
      tax: 190,
      partnerFee: 0,
      commission: 238,
      net: 952,
    },
    byProperty: [],
    paymentCount: 1,
    ...overrides,
  };
}

function makeData(
  overrides: Partial<DisbursementReportData> = {},
): DisbursementReportData {
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
      gross: 1190,
      tax: 190,
      partnerFee: 0,
      commission: 238,
      net: 952,
      paymentCount: 1,
    },
    months: [month()],
    ...overrides,
  };
}

describe("DisbursementPdfRenderer", () => {
  let renderer: DisbursementPdfRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDocInstance.on.mockImplementation(
      (event: string, handler: () => void) => {
        if (event === "pageAdded") {
          mockDocInstance._pageHandler = handler;
        }
        return mockDocInstance;
      },
    );
    mockDocInstance.bufferedPageRange.mockReturnValue({ start: 0, count: 1 });
    renderer = new DisbursementPdfRenderer();
  });

  it("sets Content-Type and Content-Disposition headers", () => {
    const res = makeRes();
    callRender(renderer, makeData(), "es", res);
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/pdf",
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringMatching(
        /^attachment; filename="travelhub-disbursements-.*\.pdf"$/,
      ),
    );
  });

  it("renders empty state when months array is empty", () => {
    const res = makeRes();
    callRender(renderer, makeData({ months: [] }), "es", res);
    const allText = collectText();
    expect(allText).toContain("Sin desembolsos");
  });

  it("renders English locale", () => {
    const res = makeRes();
    callRender(renderer, makeData({ months: [] }), "en", res);
    const allText = collectText();
    expect(allText).toContain("No disbursements");
  });

  it("renders status labels for paid, pending, projected and failed", () => {
    const res = makeRes();
    callRender(
      renderer,
      makeData({
        months: [
          month({ status: "paid", paidAt: "2026-04-15T10:00:00.000Z" }),
          month({ status: "pending" }),
          month({ status: "projected" }),
          month({ status: "failed" }),
        ],
      }),
      "es",
      res,
    );
    const allText = collectText();
    expect(allText).toContain("Pagado");
    expect(allText).toContain("Pendiente");
    expect(allText).toContain("Proyectado");
    expect(allText).toContain("Fallido");
  });

  it("uses external transfer reference when present", () => {
    const res = makeRes();
    callRender(
      renderer,
      makeData({
        months: [month({ externalTransferRef: "TRF-12345", status: "paid" })],
      }),
      "es",
      res,
    );
    const allText = collectText();
    expect(allText).toContain("TRF-12345");
  });

  it("renders dash for missing paidAt and externalTransferRef", () => {
    const res = makeRes();
    callRender(
      renderer,
      makeData({
        months: [
          month({ paidAt: null, externalTransferRef: null, status: "pending" }),
        ],
      }),
      "es",
      res,
    );
    const allText = collectText();
    expect(allText).toContain("—");
  });

  it("pages when months exceed page height and runs pageAdded handler", () => {
    mockDocInstance.addPage.mockImplementation(() => {
      mockDocInstance._pageHandler?.();
    });
    const months = Array.from({ length: 50 }, (_, i) =>
      month({ month: `2026-${String((i % 12) + 1).padStart(2, "0")}` }),
    );
    const res = makeRes();
    callRender(renderer, makeData({ months }), "es", res);
    const addPageCount = mockDocInstance.addPage.mock.calls.length;
    expect(addPageCount).toBeGreaterThan(1);
  });

  it("writes a footer page-of-pages annotation for each buffered page", () => {
    mockDocInstance.bufferedPageRange.mockReturnValue({ start: 0, count: 3 });
    const res = makeRes();
    callRender(renderer, makeData({ months: [] }), "es", res);
    expect(mockDocInstance.switchToPage).toHaveBeenCalledTimes(3);
  });

  it("uses the logo when readFileSync succeeds", () => {
    mockReadFileSync.mockReturnValueOnce(Buffer.from([1, 2, 3]) as never);
    const res = makeRes();
    callRender(renderer, makeData(), "es", res);
    expect(mockDocInstance.image).toHaveBeenCalled();
  });

  it("does not throw when doc.image fails", () => {
    mockReadFileSync.mockReturnValueOnce(Buffer.from([1, 2, 3]) as never);
    mockDocInstance.image.mockImplementationOnce(() => {
      throw new Error("bad image");
    });
    const res = makeRes();
    expect(() => callRender(renderer, makeData(), "es", res)).not.toThrow();
  });
});

describe("disbursementFilename", () => {
  function makeHeader(
    overrides: Partial<DisbursementReportData["header"]> = {},
  ) {
    return {
      partnerId: "p1",
      partnerName: "Partner X",
      propertyId: null,
      propertyName: null,
      from: "2026-03-01",
      to: "2026-04-01",
      generatedAt: "2026-04-02T10:00:00.000Z",
      currency: "USD" as const,
      ...overrides,
    };
  }

  it("uses propertyName when propertyId is set", () => {
    const name = disbursementFilename(
      {
        header: makeHeader({
          propertyId: "prop-1",
          propertyName: "Hotel Las Brisas",
        }),
        totals: {
          gross: 0,
          tax: 0,
          partnerFee: 0,
          commission: 0,
          net: 0,
          paymentCount: 0,
        },
        months: [],
      },
      "pdf",
    );
    expect(name).toBe(
      "travelhub-disbursements-hotel-las-brisas-2026-03-01_2026-04-01.pdf",
    );
  });

  it("falls back to propertyId when propertyName empty", () => {
    const name = disbursementFilename(
      {
        header: makeHeader({ propertyId: "prop-x", propertyName: "" }),
        totals: {
          gross: 0,
          tax: 0,
          partnerFee: 0,
          commission: 0,
          net: 0,
          paymentCount: 0,
        },
        months: [],
      },
      "csv",
    );
    expect(name).toContain("prop-x");
    expect(name).toMatch(/\.csv$/);
  });

  it("uses partnerName when no propertyId", () => {
    const name = disbursementFilename(
      {
        header: makeHeader({ partnerName: "Hotel Group" }),
        totals: {
          gross: 0,
          tax: 0,
          partnerFee: 0,
          commission: 0,
          net: 0,
          paymentCount: 0,
        },
        months: [],
      },
      "pdf",
    );
    expect(name).toBe(
      "travelhub-disbursements-hotel-group-2026-03-01_2026-04-01.pdf",
    );
  });

  it("defaults to 'partner' when no name available", () => {
    const name = disbursementFilename(
      {
        header: makeHeader({ partnerName: "" }),
        totals: {
          gross: 0,
          tax: 0,
          partnerFee: 0,
          commission: 0,
          net: 0,
          paymentCount: 0,
        },
        months: [],
      },
      "pdf",
    );
    expect(name).toContain("partner");
  });
});
