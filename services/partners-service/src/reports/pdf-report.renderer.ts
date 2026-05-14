import { readFileSync } from "fs";
import { join } from "path";
import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { ReportData, ReportLocale } from "./report.types.js";
import { reportStrings } from "./report-i18n.js";

// __dirname resolves to dist/partners-service/src/reports/ at runtime.
// logo.png is copied by nest-cli to dist/partners-service/assets/logo.png.
let LOGO_BUFFER: Buffer | null = null;
function loadLogo(): Buffer | null {
  if (LOGO_BUFFER) return LOGO_BUFFER;
  try {
    LOGO_BUFFER = readFileSync(join(__dirname, "..", "assets", "logo.png"));
    return LOGO_BUFFER;
  } catch {
    return null;
  }
}

// Letter landscape: 792×612 pt
const PAGE_W = 792;
const PAGE_H = 612;
const MARGIN = 32;
const BRAND = "#1B4F8C";
const MUTED = "#666666";
const BORDER = "#E5E7EB";

interface Column {
  key:
    | "date"
    | "reservation"
    | "property"
    | "method"
    | "reference"
    | "nights"
    | "rate"
    | "subtotal"
    | "taxes"
    | "total"
    | "commission"
    | "net";
  width: number;
  align: "left" | "right";
  isCurrency: boolean;
}

// Sum of widths must equal PAGE_W - 2*MARGIN = 728.
const COLUMNS_WITH_PROPERTY: Column[] = [
  { key: "date", width: 60, align: "left", isCurrency: false },
  { key: "reservation", width: 70, align: "left", isCurrency: false },
  { key: "property", width: 130, align: "left", isCurrency: false },
  { key: "method", width: 50, align: "left", isCurrency: false },
  { key: "reference", width: 90, align: "left", isCurrency: false },
  { key: "nights", width: 38, align: "right", isCurrency: false },
  { key: "rate", width: 56, align: "right", isCurrency: true },
  { key: "subtotal", width: 56, align: "right", isCurrency: true },
  { key: "taxes", width: 56, align: "right", isCurrency: true },
  { key: "total", width: 56, align: "right", isCurrency: true },
  { key: "commission", width: 56, align: "right", isCurrency: true },
  { key: "net", width: 60, align: "right", isCurrency: true },
];

const COLUMNS_NO_PROPERTY: Column[] = [
  { key: "date", width: 72, align: "left", isCurrency: false },
  { key: "reservation", width: 90, align: "left", isCurrency: false },
  { key: "method", width: 60, align: "left", isCurrency: false },
  { key: "reference", width: 120, align: "left", isCurrency: false },
  { key: "nights", width: 44, align: "right", isCurrency: false },
  { key: "rate", width: 60, align: "right", isCurrency: true },
  { key: "subtotal", width: 60, align: "right", isCurrency: true },
  { key: "taxes", width: 60, align: "right", isCurrency: true },
  { key: "total", width: 60, align: "right", isCurrency: true },
  { key: "commission", width: 60, align: "right", isCurrency: true },
  { key: "net", width: 42, align: "right", isCurrency: true },
];

const ROW_HEIGHT = 16;

@Injectable()
export class PdfReportRenderer {
  renderPdf(data: ReportData, locale: ReportLocale, res: Response): void {
    const t = reportStrings(locale);
    const showPropertyColumn = !data.header.propertyId;
    const columns = showPropertyColumn
      ? COLUMNS_WITH_PROPERTY
      : COLUMNS_NO_PROPERTY;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${reportFilename(data, "pdf")}"`,
    );

    const doc = new PDFDocument({
      size: [PAGE_W, PAGE_H],
      margin: MARGIN,
      bufferPages: true,
      autoFirstPage: false,
    });
    doc.pipe(res);

    doc.addPage();
    drawHeader(doc, data, t);
    drawTotals(doc, data, t);
    const tableTop = 230;
    drawTableHeader(doc, columns, t, tableTop);

    let y = tableTop + ROW_HEIGHT;

    doc.on("pageAdded", () => {
      drawHeader(doc, data, t);
      drawTableHeader(doc, columns, t, 110);
      y = 110 + ROW_HEIGHT;
    });

    if (data.rows.length === 0) {
      doc
        .font("Helvetica-Oblique")
        .fontSize(10)
        .fillColor(MUTED)
        .text(t.empty, MARGIN, y + 8, {
          width: PAGE_W - 2 * MARGIN,
          align: "center",
        });
    } else {
      for (const row of data.rows) {
        if (y + ROW_HEIGHT > PAGE_H - 36) {
          doc.addPage();
          // y is reset by the pageAdded handler
        }
        drawRow(doc, columns, row, y);
        y += ROW_HEIGHT;
      }
    }

    // Footer with page numbers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      drawFooter(doc, t, i - range.start + 1, range.count);
    }

    doc.end();
  }
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  data: ReportData,
  t: ReturnType<typeof reportStrings>,
): void {
  const logo = loadLogo();
  if (logo) {
    try {
      doc.image(logo, MARGIN, 28, { width: 90 });
    } catch {
      // ignore — logo missing in non-prod
    }
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(BRAND)
    .text(t.title, MARGIN + 110, 30);

  doc.font("Helvetica").fontSize(9).fillColor("#333333");

  const leftX = MARGIN + 110;
  let lineY = 56;
  doc.text(`${t.header.partner}: ${data.header.partnerName}`, leftX, lineY);
  lineY += 12;
  doc.text(
    `${t.header.property}: ${data.header.propertyName ?? t.header.allProperties}`,
    leftX,
    lineY,
  );

  const rightX = PAGE_W / 2 + 40;
  doc.text(
    `${t.header.period}: ${data.header.from} → ${endLabel(data.header.to)}`,
    rightX,
    56,
  );
  doc.text(
    `${t.header.generatedAt}: ${data.header.generatedAt.slice(0, 19).replace("T", " ")} UTC`,
    rightX,
    68,
  );
  doc.fillColor(MUTED).text(t.header.currencyNote, rightX, 80);

  // Divider
  doc
    .moveTo(MARGIN, 100)
    .lineTo(PAGE_W - MARGIN, 100)
    .strokeColor(BORDER)
    .lineWidth(0.5)
    .stroke();
}

function drawTotals(
  doc: PDFKit.PDFDocument,
  data: ReportData,
  t: ReturnType<typeof reportStrings>,
): void {
  const top = 120;
  const cardW = 170;
  const gap = 12;
  const cards = [
    { label: t.totals.gross, value: data.totals.grossUsd, bold: false },
    { label: t.totals.taxes, value: data.totals.taxUsd, bold: false },
    {
      label: t.totals.commission,
      value: data.totals.commissionUsd,
      bold: false,
    },
    { label: t.totals.net, value: data.totals.netUsd, bold: true },
  ];

  cards.forEach((card, i) => {
    const x = MARGIN + i * (cardW + gap);
    doc
      .lineWidth(0.6)
      .strokeColor(BORDER)
      .roundedRect(x, top, cardW, 60, 6)
      .stroke();
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(MUTED)
      .text(card.label.toUpperCase(), x + 12, top + 10, {
        width: cardW - 24,
        align: "left",
      });
    doc
      .font(card.bold ? "Helvetica-Bold" : "Helvetica-Bold")
      .fontSize(card.bold ? 18 : 16)
      .fillColor(card.bold ? BRAND : "#1F2937")
      .text(formatUsd(card.value), x + 12, top + 28, {
        width: cardW - 24,
        align: "left",
      });
  });
}

function drawTableHeader(
  doc: PDFKit.PDFDocument,
  columns: Column[],
  t: ReturnType<typeof reportStrings>,
  top: number,
): void {
  doc
    .save()
    .rect(MARGIN, top, PAGE_W - 2 * MARGIN, ROW_HEIGHT)
    .fillColor("#F4F6FA")
    .fill()
    .restore();

  let x = MARGIN;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(BRAND);
  for (const col of columns) {
    doc.text(t.columns[col.key], x + 4, top + 4, {
      width: col.width - 8,
      align: col.align,
    });
    x += col.width;
  }
}

function drawRow(
  doc: PDFKit.PDFDocument,
  columns: Column[],
  row: import("../partners/dashboard.types.js").PaymentRow,
  top: number,
): void {
  let x = MARGIN;
  doc.font("Helvetica").fontSize(8).fillColor("#1F2937");
  for (const col of columns) {
    const value = cellValue(col, row);
    doc.text(value, x + 4, top + 4, {
      width: col.width - 8,
      align: col.align,
      ellipsis: true,
      lineBreak: false,
    });
    x += col.width;
  }
  // Row separator
  doc
    .moveTo(MARGIN, top + ROW_HEIGHT)
    .lineTo(PAGE_W - MARGIN, top + ROW_HEIGHT)
    .strokeColor(BORDER)
    .lineWidth(0.25)
    .stroke();
}

function cellValue(
  col: Column,
  row: import("../partners/dashboard.types.js").PaymentRow,
): string {
  switch (col.key) {
    case "date":
      return row.createdAt.slice(0, 10);
    case "reservation":
      return row.reservationId.slice(0, 8);
    case "property":
      return row.propertyName || "—";
    case "method":
      return row.paymentMethod;
    case "reference":
      return row.reference;
    case "nights":
      return String(row.nights);
    case "rate":
      return formatUsd(row.ratePerNightUsd);
    case "subtotal":
      return formatUsd(row.subtotalUsd);
    case "taxes":
      return formatUsd(row.taxesUsd);
    case "total":
      return formatUsd(row.totalPaidUsd);
    case "commission":
      return formatUsd(row.commissionUsd);
    case "net":
      return formatUsd(row.earningsUsd);
  }
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  t: ReturnType<typeof reportStrings>,
  current: number,
  total: number,
): void {
  const y = PAGE_H - 22;
  doc.font("Helvetica").fontSize(8).fillColor(MUTED);
  doc.text(t.footer.pageOf(current, total), MARGIN, y, {
    width: 200,
    align: "left",
  });
  doc.text(t.header.currencyNote, MARGIN + 200, y, {
    width: PAGE_W - 2 * MARGIN - 400,
    align: "center",
  });
  doc.text(t.footer.generatedBy, PAGE_W - MARGIN - 200, y, {
    width: 200,
    align: "right",
  });
}

function formatUsd(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${abs}`;
}

function endLabel(toExclusive: string): string {
  // The endpoint takes `to` as exclusive; display it as inclusive (to - 1 day).
  const d = new Date(`${toExclusive}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return toExclusive;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function reportFilename(data: ReportData, ext: "pdf" | "xlsx"): string {
  const scope = data.header.propertyId
    ? (data.header.propertyName || data.header.propertyId).slice(0, 30)
    : (data.header.partnerName || "partner").slice(0, 30);
  const safe = scope
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  return `travelhub-${safe}-${data.header.from}_${data.header.to}.${ext}`;
}
