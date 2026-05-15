import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import type { ReportData, ReportLocale } from "./exports.types.js";
import { reportStrings } from "./exports-i18n.js";
import { reportFilename } from "./payments-pdf.renderer.js";
import { csvRow } from "./csv.js";

@Injectable()
export class PaymentsCsvRenderer {
  render(data: ReportData, locale: ReportLocale, res: Response): void {
    const t = reportStrings(locale);
    const showProperty = !data.header.propertyId;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${reportFilename(data, "csv")}"`,
    );

    const header = [
      t.columns.date,
      t.columns.reservation,
      ...(showProperty ? [t.columns.property] : []),
      t.columns.method,
      t.columns.reference,
      t.columns.nights,
      t.columns.rate,
      t.columns.subtotal,
      t.columns.taxes,
      t.columns.total,
      t.columns.commission,
      t.columns.net,
    ];

    res.write("﻿"); // BOM so Excel auto-detects UTF-8
    res.write(csvRow(header));

    for (const r of data.rows) {
      const cells: (string | number)[] = [
        r.createdAt.slice(0, 10),
        r.reservationId.slice(0, 8),
        ...(showProperty ? [r.propertyName || ""] : []),
        r.paymentMethod,
        r.reference,
        r.nights,
        r.ratePerNightUsd,
        r.subtotalUsd,
        r.taxesUsd,
        r.totalPaidUsd,
        r.commissionUsd,
        r.earningsUsd,
      ];
      res.write(csvRow(cells));
    }

    res.end();
  }
}
