import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { PartnersService } from "./partners.service.js";
import {
  CreatePartnerDto,
  RegisterPartnerDto,
  UpdatePartnerDto,
} from "./dto/partner.dto.js";
import { ExportsService } from "../exports/exports.service.js";
import { PaymentsPdfRenderer } from "../exports/payments-pdf.renderer.js";
import { PaymentsCsvRenderer } from "../exports/payments-csv.renderer.js";
import { DisbursementPdfRenderer } from "../exports/disbursement-pdf.renderer.js";
import { DisbursementCsvRenderer } from "../exports/disbursement-csv.renderer.js";
import { resolveLocale } from "../exports/exports-i18n.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type ExportFormat = "pdf" | "csv";

@Controller("partners")
export class PartnersController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly exportsService: ExportsService,
    private readonly paymentsPdf: PaymentsPdfRenderer,
    private readonly paymentsCsv: PaymentsCsvRenderer,
    private readonly disbursementPdf: DisbursementPdfRenderer,
    private readonly disbursementCsv: DisbursementCsvRenderer,
  ) {}

  // ─── Partner CRUD ─────────────────────────────────────────────────────────────

  @Get()
  findAll() {
    return this.partnersService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.partnersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePartnerDto) {
    return this.partnersService.create(dto);
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterPartnerDto) {
    return this.partnersService.register(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePartnerDto) {
    return this.partnersService.update(id, dto);
  }

  // ─── Partner dashboard ───────────────────────────────────────────────────────

  @Get(":partnerId/metrics")
  partnerMetrics(
    @Param("partnerId") partnerId: string,
    @Query("month") month?: string,
    @Query("roomType") roomType?: string,
  ) {
    const safeMonth = isMonth(month) ? month! : currentMonth();
    const safeRoomType = roomType?.trim() ? roomType.trim() : null;
    return this.partnersService.getPartnerMetrics(
      partnerId,
      safeMonth,
      safeRoomType,
    );
  }

  @Get(":partnerId/payments")
  async partnerPayments(
    @Param("partnerId") partnerId: string,
    @Query("month") month?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
    @Query("format") formatRaw?: string,
    @Query("lang") lang?: string,
    @Headers("x-partner-id") headerPartnerId?: string,
    @Res() res?: Response,
  ): Promise<unknown> {
    return this.paymentsEndpoint(
      partnerId,
      null,
      month,
      from,
      to,
      pageRaw,
      pageSizeRaw,
      formatRaw,
      lang,
      headerPartnerId,
      res,
    );
  }

  @Get(":partnerId/properties/:propertyId/payments")
  async propertyPayments(
    @Param("partnerId") partnerId: string,
    @Param("propertyId") propertyId: string,
    @Query("month") month?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
    @Query("format") formatRaw?: string,
    @Query("lang") lang?: string,
    @Headers("x-partner-id") headerPartnerId?: string,
    @Res() res?: Response,
  ): Promise<unknown> {
    return this.paymentsEndpoint(
      partnerId,
      propertyId,
      month,
      from,
      to,
      pageRaw,
      pageSizeRaw,
      formatRaw,
      lang,
      headerPartnerId,
      res,
    );
  }

  @Get(":partnerId/disbursements")
  async disbursements(
    @Param("partnerId") partnerId: string,
    @Query("month") month?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("propertyId") propertyId?: string,
    @Query("format") formatRaw?: string,
    @Query("lang") lang?: string,
    @Headers("x-partner-id") headerPartnerId?: string,
    @Res() res?: Response,
  ): Promise<unknown> {
    const format = resolveFormat(formatRaw);
    const range = resolveRange(from, to, month);
    const safePropertyId = propertyId?.trim() || null;

    if (!format) {
      const data = await this.partnersService.getDisbursementHistory(
        partnerId,
        range.from,
        range.to,
        safePropertyId,
      );
      if (!res) return data;
      res.json(data);
      return;
    }

    assertPartnerScope(partnerId, headerPartnerId);
    const data = await this.exportsService.loadDisbursementReportData(
      partnerId,
      range.from,
      range.to,
      safePropertyId,
    );
    return format === "pdf"
      ? this.disbursementPdf.render(data, resolveLocale(lang), res!)
      : this.disbursementCsv.render(data, resolveLocale(lang), res!);
  }

  // ─── Internal dispatch shared by partner/property payments ─────────────────

  private async paymentsEndpoint(
    partnerId: string,
    propertyId: string | null,
    month: string | undefined,
    from: string | undefined,
    to: string | undefined,
    pageRaw: string | undefined,
    pageSizeRaw: string | undefined,
    formatRaw: string | undefined,
    lang: string | undefined,
    headerPartnerId: string | undefined,
    res: Response | undefined,
  ): Promise<unknown> {
    const format = resolveFormat(formatRaw);

    if (format) {
      assertPartnerScope(partnerId, headerPartnerId);
      const range = resolveRange(from, to, month);
      const data = await this.exportsService.loadReportData(
        partnerId,
        range.from,
        range.to,
        propertyId,
      );
      return format === "pdf"
        ? this.paymentsPdf.render(data, resolveLocale(lang), res!)
        : this.paymentsCsv.render(data, resolveLocale(lang), res!);
    }

    const range = resolveRange(from, to, month);
    const page = clampInt(pageRaw, 1, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = clampInt(pageSizeRaw, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
    const data = await this.partnersService.getPayments(
      partnerId,
      propertyId,
      range.from,
      range.to,
      page,
      pageSize,
    );
    if (!res) return data;
    res.json(data);
    return;
  }
}

function isMonth(s: string | undefined): boolean {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function clampInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function resolveFormat(raw: string | undefined): ExportFormat | null {
  if (raw === undefined || raw === "") return null;
  if (raw === "pdf" || raw === "csv") return raw;
  throw new BadRequestException(`Unsupported format: ${raw}`);
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function resolveRange(
  from: string | undefined,
  to: string | undefined,
  month: string | undefined,
): { from: string; to: string } {
  if (from && to) {
    if (!DATE_REGEX.test(from) || !DATE_REGEX.test(to)) {
      throw new BadRequestException("'from' and 'to' must be YYYY-MM-DD");
    }
    return { from, to };
  }
  const safeMonth = isMonth(month) ? month! : currentMonth();
  return monthRange(safeMonth);
}

function monthRange(month: string): { from: string; to: string } {
  const [yStr, mStr] = month.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { from, to };
}

function assertPartnerScope(
  pathPartnerId: string,
  headerPartnerId: string | undefined,
): void {
  if (headerPartnerId && headerPartnerId !== pathPartnerId) {
    throw new ForbiddenException("partner mismatch");
  }
}
