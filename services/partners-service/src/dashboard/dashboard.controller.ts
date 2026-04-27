import { Controller, Get, Param, Query } from "@nestjs/common";
import { DashboardService } from "./dashboard.service.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Controller("partners")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get(":partnerId/hotel-state")
  hotelState(
    @Param("partnerId") partnerId: string,
    @Query("month") month?: string,
    @Query("roomType") roomType?: string,
  ) {
    const safeMonth = isMonth(month) ? month! : currentMonth();
    const safeRoomType = roomType?.trim() ? roomType.trim() : null;
    return this.dashboardService.getHotelState(
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
  ) {
    const safeMonth = isMonth(month) ? month! : null;
    const page = clampInt(pageRaw, 1, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = clampInt(pageSizeRaw, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
    return this.dashboardService.getPayments(
      partnerId,
      safeMonth,
      page,
      pageSize,
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
