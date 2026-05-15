import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import type { DisbursementReportData, ReportLocale } from "./exports.types.js";
import { reportStrings } from "./exports-i18n.js";
import { disbursementFilename } from "./disbursement-pdf.renderer.js";
import { csvRow } from "./csv.js";

@Injectable()
export class DisbursementCsvRenderer {
  render(
    data: DisbursementReportData,
    locale: ReportLocale,
    res: Response,
  ): void {
    const t = reportStrings(locale);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${disbursementFilename(data, "csv")}"`,
    );

    const header = [
      t.disbursement.columns.month,
      t.disbursement.columns.scheduledFor,
      t.disbursement.columns.status,
      t.disbursement.columns.paidAt,
      t.disbursement.columns.reference,
      t.disbursement.columns.gross,
      t.disbursement.columns.commission,
      t.disbursement.columns.net,
      t.disbursement.columns.payments,
    ];

    res.write("﻿");
    res.write(csvRow(header));

    for (const m of data.months) {
      const cells: (string | number)[] = [
        m.month,
        m.scheduledFor,
        t.disbursement.status[m.status] ?? m.status,
        m.paidAt ? m.paidAt.slice(0, 10) : "",
        m.externalTransferRef ?? "",
        m.totals.gross,
        m.totals.commission,
        m.totals.net,
        m.paymentCount,
      ];
      res.write(csvRow(cells));
    }

    res.end();
  }
}
