import { ConflictException, Injectable, Logger } from "@nestjs/common";
import { PartnersRepository } from "./partners.repository.js";
import { AuthClientService } from "../clients/auth-client.service.js";
import { MembersRepository } from "../members/members.repository.js";
import { BookingClientService } from "../clients/booking-client.service.js";
import { PaymentClientService } from "../clients/payment-client.service.js";
import {
  CreatePartnerDto,
  RegisterPartnerDto,
  UpdatePartnerDto,
} from "./dto/partner.dto.js";
import type {
  MetricCard,
  MonthlySeriesPoint,
  PartnerMetricsResponse,
  PaymentRow,
  PaymentsResponse,
  ReservationDto,
} from "./dashboard.types.js";

const COMMISSION_RATE = 0.2;
const TAX_RATE = 0.19;
const REVENUE_STATUSES = new Set(["confirmed", "submitted"]);
const LOSS_STATUSES = new Set(["cancelled", "failed", "expired"]);

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    private readonly repo: PartnersRepository,
    private readonly authClient: AuthClientService,
    private readonly membersRepo: MembersRepository,
    private readonly bookingClient: BookingClientService,
    private readonly paymentClient: PaymentClientService,
  ) {}

  // ─── Partner CRUD ─────────────────────────────────────────────────────────────

  async findAll() {
    return this.repo.findAll();
  }

  async findOne(id: string) {
    return this.repo.findById(id);
  }

  async create(dto: CreatePartnerDto) {
    const existing = await this.repo.findBySlug(dto.slug);
    if (existing)
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    return this.repo.insert({ name: dto.name, slug: dto.slug });
  }

  async update(id: string, dto: UpdatePartnerDto) {
    return this.repo.update(id, dto);
  }

  async register(dto: RegisterPartnerDto) {
    const existing = await this.repo.findBySlug(dto.slug);
    if (existing)
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);

    const partner = await this.repo.insert({
      name: dto.orgName,
      slug: dto.slug,
    });

    let challengeId: string;
    try {
      const { challengeId: cid, userId } =
        await this.authClient.createOwnerUser({
          email: dto.ownerEmail,
          password: dto.ownerPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          partnerId: partner.id,
        });
      challengeId = cid;

      await this.membersRepo.insert({
        partnerId: partner.id,
        userId,
        role: "owner",
        propertyId: null,
      });
    } catch (err) {
      this.logger.error(
        `Failed to create owner user for partner ${partner.id}, compensating: ${err}`,
      );
      await this.repo.delete(partner.id).catch((deleteErr) => {
        this.logger.warn(
          `Failed to compensate (delete partner ${partner.id}): ${deleteErr}`,
        );
      });
      throw err;
    }

    return { partner, challengeId };
  }

  // ─── Partner dashboard ───────────────────────────────────────────────────────

  async getPartnerMetrics(
    partnerId: string,
    month: string,
    roomType: string | null,
  ): Promise<PartnerMetricsResponse> {
    const all = await this.bookingClient.listReservations();
    const scoped = all.filter((r) => r.partnerId === partnerId);
    const filtered = filterReservations(scoped, month, roomType);
    return {
      partnerId,
      month,
      roomType,
      metrics: computeMetrics(filtered),
      monthlySeries: buildMonthlySeries(scoped, month, roomType),
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

    return { partnerId, month, total, page, pageSize, rows };
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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
