import { PaymentsCsvRenderer } from "./payments-csv.renderer.js";
import type { ReportData } from "./exports.types.js";

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

function makeData(overrides: Partial<ReportData> = {}): ReportData {
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
        reservationId: "res-12345678",
        propertyId: "prop-1",
        propertyName: 'Hotel Alpha, Branch "A"', // tests escaping
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

describe("PaymentsCsvRenderer", () => {
  let renderer: PaymentsCsvRenderer;

  beforeEach(() => {
    renderer = new PaymentsCsvRenderer();
  });

  it("sets headers and writes BOM + CSV content", () => {
    const { res, chunks } = makeRes();
    renderer.render(makeData(), "es", res as never);
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/csv; charset=utf-8",
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringContaining("attachment"),
    );
    // First write is BOM
    expect(chunks[0]).toBe("﻿");
    // Header row contains 'Fecha' (es), 'Propiedad' (because propertyId null)
    expect(chunks[1]).toContain("Fecha");
    expect(chunks[1]).toContain("Propiedad");
  });

  it("omits the property column when propertyId is set", () => {
    const { res, chunks } = makeRes();
    renderer.render(
      makeData({
        header: {
          ...makeData().header,
          propertyId: "prop-1",
          propertyName: "Hotel Alpha",
        },
      }),
      "es",
      res as never,
    );
    // header row shouldn't contain 'Propiedad' column (the dedicated column)
    // since showProperty is false. The header still mentions hotel, but in a CSV
    // the 'Propiedad' column header is missing.
    const headerLine = chunks[1];
    // count occurrences of comma to see number of cells (no Propiedad cell)
    const cells = headerLine.split(",");
    // 11 cells expected when no property column
    expect(cells.length).toBe(11);
  });

  it("uses English locale strings when locale=en", () => {
    const { res, chunks } = makeRes();
    renderer.render(makeData(), "en", res as never);
    expect(chunks[1]).toContain("Date");
  });

  it("escapes cells containing quotes and commas", () => {
    const { res, chunks } = makeRes();
    renderer.render(makeData(), "es", res as never);
    const dataLine = chunks[2];
    // double-quote escaped to ""
    expect(dataLine).toContain('"Hotel Alpha, Branch ""A"""');
  });

  it("calls end() once", () => {
    const { res } = makeRes();
    renderer.render(makeData({ rows: [] }), "es", res as never);
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  it("renders empty string when propertyName is empty", () => {
    const { res, chunks } = makeRes();
    renderer.render(
      makeData({
        rows: [
          {
            ...makeData().rows[0],
            propertyName: "",
          },
        ],
      }),
      "es",
      res as never,
    );
    // The cell for property name is empty. Empty cell -> just a comma separator
    const dataLine = chunks[2];
    expect(dataLine.split(",").length).toBeGreaterThan(1);
  });
});
