import { readFileSync } from "fs";
import { join } from "path";
import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { DisbursementReportData, ReportLocale } from "./exports.types.js";
import { reportStrings } from "./exports-i18n.js";
import type {
  DisbursementMonthDto,
  DisbursementStatus,
} from "../partners/dashboard.types.js";

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

const PAGE_W = 792;
const PAGE_H = 612;
const MARGIN = 32;
const BRAND = "#1B4F8C";
const MUTED = "#666666";
const BORDER = "#E5E7EB";
const ROW_HEIGHT = 16;

interface Column {
  key:
    | "month"
    | "scheduledFor"
    | "status"
    | "paidAt"
    | "reference"
    | "gross"
    | "commission"
    | "net"
    | "payments";
  width: number;
  align: "left" | "right";
}

// Sum must equal PAGE_W - 2*MARGIN = 728.
const COLUMNS: Column[] = [
  { key: "month", width: 70, align: "left" },
  { key: "scheduledFor", width: 80, align: "left" },
  { key: "status", width: 70, align: "left" },
  { key: "paidAt", width: 80, align: "left" },
  { key: "reference", width: 120, align: "left" },
  { key: "gross", width: 80, align: "right" },
  { key: "commission", width: 80, align: "right" },
  { key: "net", width: 88, align: "right" },
  { key: "payments", width: 60, align: "right" },
];

@Injectable()
export class DisbursementPdfRenderer {
  render(
    data: DisbursementReportData,
    locale: ReportLocale,
    res: Response,
  ): void {
    const t = reportStrings(locale);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${disbursementFilename(data, "pdf")}"`,
    );

    const doc = new PDFDocument({
      size: [PAGE_W, PAGE_H],
      // Bottom margin 0 so footer text near the page bottom doesn't trigger
      // pdfkit's auto-pagination.
      margins: { top: MARGIN, bottom: 0, left: MARGIN, right: MARGIN },
      bufferPages: true,
      autoFirstPage: false,
    });
    doc.pipe(res);

    doc.addPage();
    drawHeader(doc, data, t);
    drawTotals(doc, data, t);
    const tableTop = 230;
    drawTableHeader(doc, t, tableTop);
    let y = tableTop + ROW_HEIGHT;

    doc.on("pageAdded", () => {
      drawHeader(doc, data, t);
      drawTableHeader(doc, t, 110);
      y = 110 + ROW_HEIGHT;
    });

    if (data.months.length === 0) {
      doc
        .font("Helvetica-Oblique")
        .fontSize(10)
        .fillColor(MUTED)
        .text(t.disbursement.empty, MARGIN, y + 8, {
          width: PAGE_W - 2 * MARGIN,
          align: "center",
        });
    } else {
      for (const month of data.months) {
        if (y + ROW_HEIGHT > PAGE_H - 36) {
          doc.addPage();
        }
        drawRow(doc, month, t, y);
        y += ROW_HEIGHT;
      }
    }

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
  data: DisbursementReportData,
  t: ReturnType<typeof reportStrings>,
): void {
  const logo = loadLogo();
  if (logo) {
    try {
      doc.image(logo, MARGIN, 28, { width: 90 });
    } catch {
      // ignore
    }
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(BRAND)
    .text(t.disbursement.title, MARGIN + 110, 30);

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

  doc
    .moveTo(MARGIN, 100)
    .lineTo(PAGE_W - MARGIN, 100)
    .strokeColor(BORDER)
    .lineWidth(0.5)
    .stroke();
}

function drawTotals(
  doc: PDFKit.PDFDocument,
  data: DisbursementReportData,
  t: ReturnType<typeof reportStrings>,
): void {
  const top = 120;
  const cardW = 170;
  const gap = 12;
  const cards: Array<{
    label: string;
    value: string;
    bold: boolean;
  }> = [
    {
      label: t.disbursement.columns.gross,
      value: formatUsd(data.totals.gross),
      bold: false,
    },
    {
      label: t.disbursement.columns.commission,
      value: formatUsd(data.totals.commission),
      bold: false,
    },
    {
      label: t.disbursement.columns.net,
      value: formatUsd(data.totals.net),
      bold: true,
    },
    {
      label: t.disbursement.columns.payments,
      value: String(data.totals.paymentCount),
      bold: false,
    },
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
      .font("Helvetica-Bold")
      .fontSize(card.bold ? 18 : 16)
      .fillColor(card.bold ? BRAND : "#1F2937")
      .text(card.value, x + 12, top + 28, {
        width: cardW - 24,
        align: "left",
      });
  });
}

function drawTableHeader(
  doc: PDFKit.PDFDocument,
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
  for (const col of COLUMNS) {
    doc.text(t.disbursement.columns[col.key], x + 4, top + 4, {
      width: col.width - 8,
      align: col.align,
    });
    x += col.width;
  }
}

function drawRow(
  doc: PDFKit.PDFDocument,
  month: DisbursementMonthDto,
  t: ReturnType<typeof reportStrings>,
  top: number,
): void {
  let x = MARGIN;
  doc.font("Helvetica").fontSize(8).fillColor("#1F2937");
  for (const col of COLUMNS) {
    doc.text(cellValue(col, month, t), x + 4, top + 4, {
      width: col.width - 8,
      align: col.align,
      ellipsis: true,
      lineBreak: false,
    });
    x += col.width;
  }
  doc
    .moveTo(MARGIN, top + ROW_HEIGHT)
    .lineTo(PAGE_W - MARGIN, top + ROW_HEIGHT)
    .strokeColor(BORDER)
    .lineWidth(0.25)
    .stroke();
}

function cellValue(
  col: Column,
  m: DisbursementMonthDto,
  t: ReturnType<typeof reportStrings>,
): string {
  switch (col.key) {
    case "month":
      return m.month;
    case "scheduledFor":
      return m.scheduledFor;
    case "status":
      return statusLabel(m.status, t);
    case "paidAt":
      return m.paidAt ? m.paidAt.slice(0, 10) : "—";
    case "reference":
      return m.externalTransferRef || "—";
    case "gross":
      return formatUsd(m.totals.gross);
    case "commission":
      return formatUsd(m.totals.commission);
    case "net":
      return formatUsd(m.totals.net);
    case "payments":
      return String(m.paymentCount);
  }
}

function statusLabel(
  status: DisbursementStatus,
  t: ReturnType<typeof reportStrings>,
): string {
  return t.disbursement.status[status] ?? status;
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  t: ReturnType<typeof reportStrings>,
  current: number,
  total: number,
): void {
  const y = PAGE_H - 22;
  doc.font("Helvetica").fontSize(8).fillColor(MUTED);
  // lineBreak: false prevents pdfkit auto-pagination when y is below the
  // doc's bottom margin (intentional for footer art).
  doc.text(t.footer.pageOf(current, total), MARGIN, y, {
    width: 200,
    align: "left",
    lineBreak: false,
  });
  doc.text(t.header.currencyNote, MARGIN + 200, y, {
    width: PAGE_W - 2 * MARGIN - 400,
    align: "center",
    lineBreak: false,
  });
  doc.text(t.footer.generatedBy, PAGE_W - MARGIN - 200, y, {
    width: 200,
    align: "right",
    lineBreak: false,
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
  const d = new Date(`${toExclusive}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return toExclusive;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function disbursementFilename(
  data: DisbursementReportData,
  ext: "pdf" | "csv",
): string {
  const scope = data.header.propertyId
    ? (data.header.propertyName || data.header.propertyId).slice(0, 30)
    : (data.header.partnerName || "partner").slice(0, 30);
  const safe = scope
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  return `travelhub-disbursements-${safe}-${data.header.from}_${data.header.to}.${ext}`;
}
