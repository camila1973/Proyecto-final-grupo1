import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Query,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { ReportsService } from "./reports.service.js";
import { PdfReportRenderer } from "./pdf-report.renderer.js";
import { XlsxReportRenderer } from "./xlsx-report.renderer.js";
import { resolveLocale } from "./report-i18n.js";

@Controller("partners")
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly pdf: PdfReportRenderer,
    private readonly xlsx: XlsxReportRenderer,
  ) {}

  @Get(":partnerId/reports/payments.pdf")
  async paymentsPdf(
    @Param("partnerId") partnerId: string,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("propertyId") propertyId: string | undefined,
    @Query("lang") lang: string | undefined,
    @Headers("x-partner-id") headerPartnerId: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    assertPartnerScope(partnerId, headerPartnerId);
    const data = await this.reports.loadReportData(
      partnerId,
      from,
      to,
      propertyId?.trim() || null,
    );
    this.pdf.renderPdf(data, resolveLocale(lang), res);
  }

  @Get(":partnerId/reports/payments.xlsx")
  async paymentsXlsx(
    @Param("partnerId") partnerId: string,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("propertyId") propertyId: string | undefined,
    @Query("lang") lang: string | undefined,
    @Headers("x-partner-id") headerPartnerId: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    assertPartnerScope(partnerId, headerPartnerId);
    const data = await this.reports.loadReportData(
      partnerId,
      from,
      to,
      propertyId?.trim() || null,
    );
    await this.xlsx.renderXlsx(data, resolveLocale(lang), res);
  }
}

function assertPartnerScope(
  pathPartnerId: string,
  headerPartnerId: string | undefined,
): void {
  // The gateway injects x-partner-id for partner-role users. If present, it
  // must match the path. Internal callers (no header) are allowed — they go
  // through the gateway's authenticated proxy by definition.
  if (headerPartnerId && headerPartnerId !== pathPartnerId) {
    throw new ForbiddenException("partner mismatch");
  }
}
