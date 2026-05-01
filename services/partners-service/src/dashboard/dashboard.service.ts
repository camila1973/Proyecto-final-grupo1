import { Injectable } from "@nestjs/common";
import { BookingClientService } from "../clients/booking-client.service.js";
import { PaymentClientService } from "../clients/payment-client.service.js";
import { InventoryClientService } from "../clients/inventory-client.service.js";
import type {
  HotelStateResponse,
  MetricCard,
  MonthlySeriesPoint,
  PartnerPropertiesResponse,
  PartnerReservation,
  PaymentRow,
  PaymentsResponse,
  PropertySummary,
  ReservationDto,
} from "./dashboard.types.js";

const COMMISSION_RATE = 0.2;
const TAX_RATE = 0.19;
const REVENUE_STATUSES = new Set(["confirmed", "submitted"]);
const LOSS_STATUSES = new Set(["cancelled", "failed", "expired"]);

@Injectable()
export class DashboardService {
  constructor(
    private readonly bookingClient: BookingClientService,
    private readonly paymentClient: PaymentClientService,
    private readonly inventoryClient: InventoryClientService,
  ) {}

  async getHotelState(
    partnerId: string,
    month: string,
    roomType: string | null,
    propertyId: string | null,
  ): Promise<HotelStateResponse> {
    const all = await this.bookingClient.listReservations();
    const partnerScoped = all.filter((r) => r.partnerId === partnerId);
    const propertyScoped = propertyId
      ? partnerScoped.filter((r) => r.propertyId === propertyId)
      : partnerScoped;
    const filtered = filterReservations(propertyScoped, month, roomType);

    return {
      partnerId,
      propertyId,
      month,
      roomType,
      metrics: computeMetrics(filtered),
      monthlySeries: buildMonthlySeries(propertyScoped, month, roomType),
      reservations: filtered.map(toPartnerReservation),
    };
  }

  async getPayments(
    partnerId: string,
    month: string | null,
    page: number,
    pageSize: number,
    propertyId: string | null,
  ): Promise<PaymentsResponse> {
    const all = await this.bookingClient.listReservations();
    const partnerScoped = all.filter((r) => r.partnerId === partnerId);
    const propertyScoped = propertyId
      ? partnerScoped.filter((r) => r.propertyId === propertyId)
      : partnerScoped;
    const monthFiltered = month
      ? propertyScoped.filter((r) => isInMonth(r.checkIn, month))
      : propertyScoped;
    const eligible = monthFiltered.filter((r) =>
      ["confirmed", "submitted", "failed"].includes(r.status),
    );

    const total = eligible.length;
    const start = Math.max(0, (page - 1) * pageSize);
    const slice = eligible.slice(start, start + pageSize);

    const rows: PaymentRow[] = await Promise.all(
      slice.map(async (r) => buildPaymentRow(r, this.paymentClient)),
    );

    return {
      partnerId,
      month,
      total,
      page,
      pageSize,
      rows,
    };
  }

  async getProperties(partnerId: string): Promise<PartnerPropertiesResponse> {
    const inventoryProperties =
      await this.inventoryClient.listPropertiesByPartner(partnerId);

    const properties: PropertySummary[] = inventoryProperties.map((p) => ({
      propertyId: p.id,
      propertyName: p.name,
      propertyCity: p.city,
      propertyNeighborhood: p.neighborhood,
      propertyCountryCode: p.countryCode,
      propertyThumbnailUrl: p.thumbnailUrl || null,
      createdAt: p.createdAt,
      roomCount: 0,
      reservationCount: 0,
    }));

    return { partnerId, properties };
  }
}

function filterReservations(
  rows: ReservationDto[],
  month: string,
  roomType: string | null,
): ReservationDto[] {
  return rows.filter((r) => {
    if (!isInMonth(r.checkIn, month)) return false;
    if (roomType) {
      const rt = r.snapshot?.roomType ?? "";
      if (rt.toLowerCase() !== roomType.toLowerCase()) return false;
    }
    return true;
  });
}

export function isInMonth(date: string, month: string): boolean {
  // month = "YYYY-MM"
  return typeof date === "string" && date.startsWith(month);
}

function computeMetrics(rows: ReservationDto[]): MetricCard {
  let confirmed = 0;
  let cancelled = 0;
  let revenueUsd = 0;
  let lossesUsd = 0;
  for (const r of rows) {
    const total = r.grandTotalUsd ?? 0;
    if (r.status === "confirmed") {
      confirmed += 1;
      revenueUsd += total;
    } else if (LOSS_STATUSES.has(r.status)) {
      cancelled += 1;
      lossesUsd += total;
    } else if (REVENUE_STATUSES.has(r.status)) {
      revenueUsd += total;
    }
  }
  return {
    confirmed,
    cancelled,
    revenueUsd: round(revenueUsd),
    lossesUsd: round(lossesUsd),
    netUsd: round(revenueUsd - lossesUsd),
  };
}

function buildMonthlySeries(
  rows: ReservationDto[],
  centerMonth: string,
  roomType: string | null,
): MonthlySeriesPoint[] {
  const months = trailingMonths(centerMonth, 6);
  return months.map((m) => {
    const monthRows = filterReservations(rows, m, roomType);
    const metrics = computeMetrics(monthRows);
    const occupancyRate = computeOccupancyRate(monthRows, m);
    return {
      month: m,
      revenueUsd: metrics.revenueUsd,
      lossesUsd: metrics.lossesUsd,
      occupancyRate,
    };
  });
}

function computeOccupancyRate(rows: ReservationDto[], month: string): number {
  // Sum occupied nights for confirmed/submitted reservations.
  // Denominator = days-in-month * distinct rooms seen for the partner this month.
  const days = daysInMonth(month);
  const rooms = new Set(rows.map((r) => r.roomId));
  if (rooms.size === 0 || days === 0) return 0;
  let occupiedNights = 0;
  for (const r of rows) {
    if (!REVENUE_STATUSES.has(r.status)) continue;
    occupiedNights += nightsInMonth(r.checkIn, r.checkOut, month);
  }
  const denom = days * rooms.size;
  return Math.min(1, round(occupiedNights / denom, 4));
}

function nightsInMonth(
  checkIn: string,
  checkOut: string,
  month: string,
): number {
  const start = new Date(`${checkIn}T00:00:00Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  const monthStart = new Date(`${month}-01T00:00:00Z`).getTime();
  const days = daysInMonth(month);
  const monthEnd = monthStart + days * 86_400_000;
  const lo = Math.max(start, monthStart);
  const hi = Math.min(end, monthEnd);
  if (hi <= lo) return 0;
  return Math.round((hi - lo) / 86_400_000);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map((s) => Number(s));
  if (!y || !m) return 0;
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function trailingMonths(month: string, count: number): string[] {
  const [y, m] = month.split("-").map((s) => Number(s));
  if (!y || !m) return [];
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const yy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    out.push(`${yy}-${mm}`);
  }
  return out;
}

function toPartnerReservation(r: ReservationDto): PartnerReservation {
  const guest = r.guestInfo ?? {};
  const guestName = [guest.firstName, guest.lastName]
    .filter((s) => !!s && String(s).trim())
    .join(" ")
    .trim();
  return {
    id: r.id,
    status: r.status,
    guestName: guestName || "—",
    guestEmail: guest.email ?? "—",
    guestPhone: guest.phone ?? "—",
    guestCount: 1,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    roomType: r.snapshot?.roomType ?? "—",
    grandTotalUsd: r.grandTotalUsd,
  };
}

async function buildPaymentRow(
  r: ReservationDto,
  paymentClient: PaymentClientService,
): Promise<PaymentRow> {
  const payment = await paymentClient.getStatus(r.id);
  const nights = countNights(r.checkIn, r.checkOut);
  const total = r.grandTotalUsd ?? payment?.amountUsd ?? 0;
  const subtotal = nights > 0 ? total / (1 + TAX_RATE) : total;
  const taxes = total - subtotal;
  const ratePerNight = nights > 0 ? subtotal / nights : 0;
  const commission = round(total * COMMISSION_RATE);
  const earnings = round(total - commission);

  return {
    reservationId: r.id,
    status: payment?.status ?? r.status,
    paymentMethod: payment?.stripePaymentIntentId ? "STRIPE" : "—",
    reference: payment?.stripePaymentIntentId ?? "—",
    nights,
    ratePerNightUsd: round(ratePerNight),
    subtotalUsd: round(subtotal),
    taxesUsd: round(taxes),
    totalPaidUsd: round(total),
    commissionUsd: -commission,
    earningsUsd: earnings,
    createdAt: payment?.createdAt ?? r.createdAt,
  };
}

export function countNights(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / 86_400_000);
}

function round(n: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
