import { Injectable, NotFoundException } from "@nestjs/common";
import { BookingClientService } from "../clients/booking-client.service.js";
import { InventoryClientService } from "../clients/inventory-client.service.js";
import type {
  MetricCard,
  MonthlySeriesPoint,
  PartnerPropertiesResponse,
  PartnerReservation,
  PropertyMetricsResponse,
  PropertyReservationsResponse,
  PropertySummary,
  ReservationDto,
} from "../partners/dashboard.types.js";

const REVENUE_STATUSES = new Set(["confirmed", "submitted"]);
const LOSS_STATUSES = new Set(["cancelled", "failed", "expired"]);

@Injectable()
export class PropertyService {
  constructor(
    private readonly bookingClient: BookingClientService,
    private readonly inventoryClient: InventoryClientService,
  ) {}

  async getPropertySummary(
    partnerId: string,
    propertyId: string,
  ): Promise<PropertySummary> {
    const p = await this.inventoryClient.getPropertyById(propertyId);
    if (!p) throw new NotFoundException(`Property ${propertyId} not found`);
    return {
      propertyId: p.id,
      propertyName: p.name,
      propertyCity: p.city,
      propertyNeighborhood: p.neighborhood,
      propertyCountryCode: p.countryCode,
      propertyThumbnailUrl: p.thumbnailUrl || null,
      createdAt: p.createdAt,
      roomCount: 0,
      reservationCount: 0,
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

  async getPropertyMetrics(
    partnerId: string,
    propertyId: string,
    month: string,
    roomType: string | null,
  ): Promise<PropertyMetricsResponse> {
    const all = await this.bookingClient.listReservations();
    const scoped = all
      .filter((r) => r.partnerId === partnerId)
      .filter((r) => r.propertyId === propertyId);
    const filtered = filterReservations(scoped, month, roomType);
    return {
      partnerId,
      propertyId,
      month,
      roomType,
      metrics: computeMetrics(filtered),
      monthlySeries: buildMonthlySeries(scoped, month, roomType),
    };
  }

  async getPropertyReservations(
    partnerId: string,
    propertyId: string,
    month: string,
    roomType: string | null,
    status: string | null = null,
    reservationId: string | null = null,
    guestName: string | null = null,
  ): Promise<PropertyReservationsResponse> {
    const all = await this.bookingClient.listReservations();
    const scoped = all
      .filter((r) => r.partnerId === partnerId)
      .filter((r) => r.propertyId === propertyId);
    const filtered = filterReservations(
      scoped,
      month,
      roomType,
      status,
      reservationId,
      guestName,
    );
    return {
      partnerId,
      propertyId,
      month,
      roomType,
      status,
      reservationId,
      guestName,
      reservations: filtered.map(toPartnerReservation),
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function filterReservations(
  rows: ReservationDto[],
  month: string,
  roomType: string | null,
  status: string | null = null,
  reservationId: string | null = null,
  guestName: string | null = null,
): ReservationDto[] {
  const guestNameLower = guestName?.toLowerCase() ?? null;
  return rows.filter((r) => {
    if (!isInMonth(r.checkIn, month)) return false;
    if (roomType) {
      const rt = r.snapshot?.roomType ?? "";
      if (rt.toLowerCase() !== roomType.toLowerCase()) return false;
    }
    if (status && r.status !== status) return false;
    if (
      reservationId &&
      !r.id.toLowerCase().includes(reservationId.toLowerCase())
    )
      return false;
    if (guestNameLower) {
      const guest = r.guestInfo;
      const fullName =
        `${guest?.firstName ?? ""} ${guest?.lastName ?? ""}`.toLowerCase();
      if (!fullName.includes(guestNameLower)) return false;
    }
    return true;
  });
}

export function isInMonth(date: string, month: string): boolean {
  // month = "YYYY-MM"
  return typeof date === "string" && date.startsWith(month);
}

export function computeMetrics(rows: ReservationDto[]): MetricCard {
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

export function buildMonthlySeries(
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

export function toPartnerReservation(r: ReservationDto): PartnerReservation {
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

function round(n: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
