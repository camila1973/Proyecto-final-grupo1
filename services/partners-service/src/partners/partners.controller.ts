import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { PartnersService } from "./partners.service.js";
import {
  CreatePartnerDto,
  RegisterPartnerDto,
  UpdatePartnerDto,
} from "./dto/partner.dto.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Controller("partners")
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

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
  payments(
    @Param("partnerId") partnerId: string,
    @Query("month") month?: string,
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
    @Query("propertyId") propertyId?: string,
  ) {
    const safeMonth = isMonth(month) ? month! : null;
    const page = clampInt(pageRaw, 1, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = clampInt(pageSizeRaw, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
    const safePropertyId = propertyId?.trim() || null;
    return this.partnersService.getPayments(
      partnerId,
      safeMonth,
      page,
      pageSize,
      safePropertyId,
    );
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
