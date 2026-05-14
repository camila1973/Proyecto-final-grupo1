import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import type { Response } from "express";
import type { ReportData, ReportLocale } from "./report.types.js";
import { reportStrings } from "./report-i18n.js";
import { reportFilename } from "./pdf-report.renderer.js";

const BRAND_FILL = "FF1B4F8C";
const HEADER_TEXT = "FFFFFFFF";

@Injectable()
export class XlsxReportRenderer {
  async renderXlsx(
    data: ReportData,
    locale: ReportLocale,
    res: Response,
  ): Promise<void> {
    const t = reportStrings(locale);
    const showPropertyColumn = !data.header.propertyId;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${reportFilename(data, "xlsx")}"`,
    );

    const wb = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true,
    });

    // ── Summary sheet ────────────────────────────────────────────────────────
    const summary = wb.addWorksheet(t.sheets.summary);
    summary.columns = [
      { header: "", width: 30 },
      { header: "", width: 30 },
    ];

    const titleRow = summary.addRow([t.title]);
    titleRow.font = { bold: true, size: 18, color: { argb: BRAND_FILL } };
    titleRow.commit();
    summary.addRow([]).commit();

    const headerRows: Array<[string, string]> = [
      [t.header.partner, data.header.partnerName],
      [t.header.property, data.header.propertyName ?? t.header.allProperties],
      [
        t.header.period,
        `${data.header.from} → ${endInclusive(data.header.to)}`,
      ],
      [
        t.header.generatedAt,
        `${data.header.generatedAt.slice(0, 19).replace("T", " ")} UTC`,
      ],
      [t.header.currencyNote, "USD"],
    ];
    for (const [label, value] of headerRows) {
      const row = summary.addRow([label, value]);
      row.getCell(1).font = { bold: true };
      row.commit();
    }
    summary.addRow([]).commit();

    const totalRows: Array<[string, number, boolean]> = [
      [t.totals.gross, data.totals.grossUsd, false],
      [t.totals.taxes, data.totals.taxUsd, false],
      [t.totals.commission, data.totals.commissionUsd, false],
      [t.totals.net, data.totals.netUsd, true],
      [t.totals.count, data.totals.count, false],
    ];
    for (const [label, value, bold] of totalRows) {
      const row = summary.addRow([label, value]);
      row.getCell(1).font = { bold: true };
      if (label === t.totals.count) {
        row.getCell(2).numFmt = "#,##0";
      } else {
        row.getCell(2).numFmt = '"$"#,##0.00;[Red]-"$"#,##0.00';
      }
      if (bold) {
        row.font = { bold: true, color: { argb: BRAND_FILL } };
      }
      row.commit();
    }
    summary.commit();

    // ── Detail sheet ─────────────────────────────────────────────────────────
    const detail = wb.addWorksheet(t.sheets.detail, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    const columns: Partial<ExcelJS.Column>[] = [
      { header: t.columns.date, key: "date", width: 12 },
      { header: t.columns.reservation, key: "reservation", width: 14 },
    ];
    if (showPropertyColumn) {
      columns.push({ header: t.columns.property, key: "property", width: 26 });
    }
    columns.push(
      { header: t.columns.method, key: "method", width: 10 },
      { header: t.columns.reference, key: "reference", width: 22 },
      { header: t.columns.nights, key: "nights", width: 8 },
      { header: t.columns.rate, key: "rate", width: 12 },
      { header: t.columns.subtotal, key: "subtotal", width: 12 },
      { header: t.columns.taxes, key: "taxes", width: 12 },
      { header: t.columns.total, key: "total", width: 14 },
      { header: t.columns.commission, key: "commission", width: 14 },
      { header: t.columns.net, key: "net", width: 14 },
    );
    detail.columns = columns as ExcelJS.Column[];

    const headerRow = detail.getRow(1);
    headerRow.font = { bold: true, color: { argb: HEADER_TEXT } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BRAND_FILL },
    };
    headerRow.alignment = { vertical: "middle" };
    headerRow.commit();

    const CURRENCY_FMT = '"$"#,##0.00;[Red]-"$"#,##0.00';

    for (const r of data.rows) {
      const cells: Record<string, string | number> = {
        date: r.createdAt.slice(0, 10),
        reservation: r.reservationId.slice(0, 8),
        method: r.paymentMethod,
        reference: r.reference,
        nights: r.nights,
        rate: r.ratePerNightUsd,
        subtotal: r.subtotalUsd,
        taxes: r.taxesUsd,
        total: r.totalPaidUsd,
        commission: r.commissionUsd,
        net: r.earningsUsd,
      };
      if (showPropertyColumn) {
        cells.property = r.propertyName || "—";
      }
      const row = detail.addRow(cells);
      const currencyKeys = [
        "rate",
        "subtotal",
        "taxes",
        "total",
        "commission",
        "net",
      ];
      for (const key of currencyKeys) {
        row.getCell(key).numFmt = CURRENCY_FMT;
      }
      row.commit();
    }

    if (data.rows.length === 0) {
      const emptyRow = detail.addRow({ date: t.empty });
      detail.mergeCells(emptyRow.number, 1, emptyRow.number, columns.length);
      const cell = emptyRow.getCell(1);
      cell.alignment = { horizontal: "center" };
      cell.font = { italic: true, color: { argb: "FF888888" } };
      // Streaming writer requires commit after merge.
      emptyRow.commit();
    }

    // Light row background banding via conditional fill (skip for streaming
    // performance; banding is cosmetic and exceljs styling each row is fine).
    detail.commit();

    await wb.commit();
  }
}

function endInclusive(toExclusive: string): string {
  const d = new Date(`${toExclusive}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return toExclusive;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
