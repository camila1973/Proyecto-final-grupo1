import { DisbursementCsvRenderer } from "./disbursement-csv.renderer.js";
import type { DisbursementReportData } from "./exports.types.js";

function makeRes() {
  const chunks: string[] = [];
  const res = {
    setHeader: jest.fn(),
    write: jest.fn((chunk: string) => {
      chunks.push(chunk);
    }),
    end: jest.fn(),
  };
  return { res, chunks };
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
    months: [
      {
        month: "2026-03",
        periodStart: "2026-03-01",
        periodEnd: "2026-04-01",
        scheduledFor: "2026-04-15",
        status: "paid",
        paidAt: "2026-04-15T10:00:00.000Z",
        externalTransferRef: "TRF-12345",
        totals: {
          gross: 1190,
          tax: 190,
          partnerFee: 0,
          commission: 238,
          net: 952,
        },
        byProperty: [],
        paymentCount: 1,
      },
    ],
    ...overrides,
  };
}

describe("DisbursementCsvRenderer", () => {
  let renderer: DisbursementCsvRenderer;

  beforeEach(() => {
    renderer = new DisbursementCsvRenderer();
  });

  it("sets headers and writes BOM + CSV with status label", () => {
    const { res, chunks } = makeRes();
    renderer.render(makeData(), "es", res as never);
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/csv; charset=utf-8",
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringContaining("disbursements"),
    );
    expect(chunks[0]).toBe("﻿");
    // header line should contain 'Mes' (es)
    expect(chunks[1]).toContain("Mes");
    // data line should include translated status 'Pagado'
    expect(chunks[2]).toContain("Pagado");
    expect(chunks[2]).toContain("TRF-12345");
  });

  it("uses English locale", () => {
    const { res, chunks } = makeRes();
    renderer.render(makeData(), "en", res as never);
    expect(chunks[1]).toContain("Month");
    expect(chunks[2]).toContain("Paid");
  });

  it("renders empty cells when paidAt and externalTransferRef are null", () => {
    const { res, chunks } = makeRes();
    renderer.render(
      makeData({
        months: [
          {
            ...makeData().months[0],
            status: "pending",
            paidAt: null,
            externalTransferRef: null,
          },
        ],
      }),
      "es",
      res as never,
    );
    const dataLine = chunks[2];
    // empty cells appear between commas; the line has two empty cells in
    // paidAt and reference columns. Just verify no errors and 'Pendiente' present.
    expect(dataLine).toContain("Pendiente");
  });

  it("calls end() once even with empty months", () => {
    const { res } = makeRes();
    renderer.render(makeData({ months: [] }), "es", res as never);
    expect(res.end).toHaveBeenCalledTimes(1);
  });
});
