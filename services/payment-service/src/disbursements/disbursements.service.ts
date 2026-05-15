import { BadRequestException, Injectable } from "@nestjs/common";
import {
  CapturedPaymentForHistory,
  CapturedPaymentForPeriod,
  DisbursementsRepository,
} from "./disbursements.repository.js";
import { DisbursementRow } from "../database/database.types.js";
import {
  AggregateTotals,
  DisbursementHistoryResponse,
  DisbursementMonth,
  DisbursementResponse,
  DisbursementStatus,
  PropertyRollup,
} from "./disbursements.types.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MonthBounds {
  periodStart: string; // first day, inclusive
  periodEnd: string; // first day of next month, exclusive
  scheduledFor: string; // first day of next month
  isCurrentMonth: boolean;
}

@Injectable()
export class DisbursementsService {
  constructor(private readonly repo: DisbursementsRepository) {}

  async getByPartnerAndMonth(
    partnerId: string,
    month: string,
  ): Promise<DisbursementResponse> {
    const bounds = monthBounds(month);
    const rows = await this.repo.findCapturedInPeriod(
      partnerId,
      bounds.periodStart,
      bounds.periodEnd,
    );

    if (bounds.isCurrentMonth) {
      // Don't persist — captures are still arriving, so the rollup would drift.
      return projectResponse(partnerId, bounds, rows);
    }

    return this.materializePastMonth(partnerId, bounds, rows);
  }

  async getHistory(
    partnerId: string,
    from: string,
    to: string,
    propertyId?: string,
  ): Promise<DisbursementHistoryResponse> {
    if (!DATE_REGEX.test(from)) {
      throw new BadRequestException("'from' must be YYYY-MM-DD");
    }
    if (!DATE_REGEX.test(to)) {
      throw new BadRequestException("'to' must be YYYY-MM-DD");
    }
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T00:00:00.000Z`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("Invalid date");
    }
    if (toDate <= fromDate) {
      throw new BadRequestException("'to' must be after 'from'");
    }
    if (toDate.getTime() - fromDate.getTime() > 366 * 86_400_000) {
      throw new BadRequestException("Range must be 366 days or less");
    }
    if (propertyId && !UUID_REGEX.test(propertyId)) {
      throw new BadRequestException("Invalid propertyId");
    }

    const [rows, headers] = await Promise.all([
      this.repo.findCapturedInRange(partnerId, fromDate, toDate, propertyId),
      this.repo.findManyByPartnerAndRange(partnerId, from, to),
    ]);

    const headerByPeriodStart = new Map<string, DisbursementRow>();
    for (const h of headers) {
      headerByPeriodStart.set(String(h.period_start), h);
    }

    const months = groupByMonth(rows);
    const nowMonth = currentYearMonth();

    const monthEntries: DisbursementMonth[] = [];
    for (const [month, monthRows] of months.entries()) {
      const bounds = monthBoundsFromYearMonth(month);
      const header = headerByPeriodStart.get(bounds.periodStart);
      const totals = computeTotals(monthRows);
      const status: DisbursementStatus = header
        ? (header.status as DisbursementStatus)
        : month === nowMonth
          ? "projected"
          : "pending";
      monthEntries.push({
        month,
        periodStart: bounds.periodStart,
        periodEnd: bounds.periodEnd,
        scheduledFor: bounds.scheduledFor,
        status,
        paidAt: header
          ? header.paid_at instanceof Date
            ? header.paid_at.toISOString()
            : (header.paid_at ?? null)
          : null,
        externalTransferRef: header?.external_transfer_ref ?? null,
        totals: {
          gross: totals.grossTotal,
          tax: totals.taxTotal,
          partnerFee: totals.partnerFeeTotal,
          commission: totals.commissionTotal,
          net: totals.netTotal,
        },
        byProperty: rollupByProperty(monthRows),
        paymentCount: monthRows.length,
      });
    }
    monthEntries.sort((a, b) => a.month.localeCompare(b.month));

    const aggregate = aggregateMonthTotals(monthEntries);

    return {
      partnerId,
      from,
      to,
      currency: "USD",
      totals: aggregate,
      paymentCount: rows.length,
      months: monthEntries,
    };
  }

  private async materializePastMonth(
    partnerId: string,
    bounds: MonthBounds,
    rows: CapturedPaymentForPeriod[],
  ): Promise<DisbursementResponse> {
    const header = await this.repo.upsertHeader({
      partnerId,
      periodStart: bounds.periodStart,
      periodEnd: bounds.periodEnd,
      scheduledFor: bounds.scheduledFor,
    });

    const totals = computeTotals(rows);
    const items = rows.map((r) => ({
      disbursement_id: header.id,
      payment_id: r.payment_id,
      property_id: r.property_id,
      property_name: r.property_name,
      gross_amount_usd: r.gross_amount_usd,
      tax_amount_usd: r.tax_amount_usd,
      partner_fee_usd: r.partner_fee_usd,
      commission_amount_usd: r.commission_amount_usd,
      net_payout_usd: r.net_payout_usd,
    }));

    await this.repo.writeItemsAndTotals(header.id, items, totals);

    return materializedResponse(partnerId, bounds, header, rows, totals);
  }
}

function monthBounds(month: string): MonthBounds {
  const [yStr, mStr] = month.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m) {
    throw new Error(`Invalid month: ${month}`);
  }
  const periodStart = `${y}-${String(m).padStart(2, "0")}-01`;
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  const scheduledFor = periodEnd;

  const now = new Date();
  const isCurrentMonth =
    now.getUTCFullYear() === y && now.getUTCMonth() + 1 === m;

  return { periodStart, periodEnd, scheduledFor, isCurrentMonth };
}

function computeTotals(rows: CapturedPaymentForPeriod[]) {
  let grossTotal = 0;
  let taxTotal = 0;
  let partnerFeeTotal = 0;
  let commissionTotal = 0;
  let netTotal = 0;
  for (const r of rows) {
    grossTotal += parseFloat(r.gross_amount_usd);
    taxTotal += parseFloat(r.tax_amount_usd);
    partnerFeeTotal += parseFloat(r.partner_fee_usd);
    commissionTotal += parseFloat(r.commission_amount_usd);
    netTotal += parseFloat(r.net_payout_usd);
  }
  return {
    grossTotal: round2(grossTotal),
    taxTotal: round2(taxTotal),
    partnerFeeTotal: round2(partnerFeeTotal),
    commissionTotal: round2(commissionTotal),
    netTotal: round2(netTotal),
  };
}

function rollupByProperty(rows: CapturedPaymentForPeriod[]): PropertyRollup[] {
  const map = new Map<string, PropertyRollup>();
  for (const r of rows) {
    const existing = map.get(r.property_id);
    if (existing) {
      existing.gross += parseFloat(r.gross_amount_usd);
      existing.tax += parseFloat(r.tax_amount_usd);
      existing.partnerFee += parseFloat(r.partner_fee_usd);
      existing.commission += parseFloat(r.commission_amount_usd);
      existing.net += parseFloat(r.net_payout_usd);
      existing.paymentCount += 1;
    } else {
      map.set(r.property_id, {
        propertyId: r.property_id,
        propertyName: r.property_name,
        gross: parseFloat(r.gross_amount_usd),
        tax: parseFloat(r.tax_amount_usd),
        partnerFee: parseFloat(r.partner_fee_usd),
        commission: parseFloat(r.commission_amount_usd),
        net: parseFloat(r.net_payout_usd),
        paymentCount: 1,
      });
    }
  }
  for (const r of map.values()) {
    r.gross = round2(r.gross);
    r.tax = round2(r.tax);
    r.partnerFee = round2(r.partnerFee);
    r.commission = round2(r.commission);
    r.net = round2(r.net);
  }
  return Array.from(map.values()).sort((a, b) => b.net - a.net);
}

function projectResponse(
  partnerId: string,
  bounds: MonthBounds,
  rows: CapturedPaymentForPeriod[],
): DisbursementResponse {
  const totals = computeTotals(rows);
  return {
    partnerId,
    periodStart: bounds.periodStart,
    periodEnd: bounds.periodEnd,
    scheduledFor: bounds.scheduledFor,
    currency: "USD",
    status: "projected",
    paidAt: null,
    externalTransferRef: null,
    totals: {
      gross: totals.grossTotal,
      tax: totals.taxTotal,
      partnerFee: totals.partnerFeeTotal,
      commission: totals.commissionTotal,
      net: totals.netTotal,
    },
    byProperty: rollupByProperty(rows),
    paymentCount: rows.length,
  };
}

function materializedResponse(
  partnerId: string,
  bounds: MonthBounds,
  header: DisbursementRow,
  rows: CapturedPaymentForPeriod[],
  totals: ReturnType<typeof computeTotals>,
): DisbursementResponse {
  return {
    partnerId,
    periodStart: bounds.periodStart,
    periodEnd: bounds.periodEnd,
    scheduledFor: bounds.scheduledFor,
    currency: header.currency,
    status: header.status as DisbursementResponse["status"],
    paidAt:
      header.paid_at instanceof Date
        ? header.paid_at.toISOString()
        : (header.paid_at ?? null),
    externalTransferRef: header.external_transfer_ref ?? null,
    totals: {
      gross: totals.grossTotal,
      tax: totals.taxTotal,
      partnerFee: totals.partnerFeeTotal,
      commission: totals.commissionTotal,
      net: totals.netTotal,
    },
    byProperty: rollupByProperty(rows),
    paymentCount: rows.length,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function groupByMonth(
  rows: CapturedPaymentForHistory[],
): Map<string, CapturedPaymentForHistory[]> {
  const out = new Map<string, CapturedPaymentForHistory[]>();
  for (const r of rows) {
    const month = r.captured_at.toISOString().slice(0, 7); // YYYY-MM
    const bucket = out.get(month);
    if (bucket) bucket.push(r);
    else out.set(month, [r]);
  }
  return out;
}

function monthBoundsFromYearMonth(yearMonth: string): {
  periodStart: string;
  periodEnd: string;
  scheduledFor: string;
} {
  const [yStr, mStr] = yearMonth.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const periodStart = `${y}-${String(m).padStart(2, "0")}-01`;
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { periodStart, periodEnd, scheduledFor: periodEnd };
}

function currentYearMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function aggregateMonthTotals(months: DisbursementMonth[]): AggregateTotals {
  const acc = { gross: 0, tax: 0, partnerFee: 0, commission: 0, net: 0 };
  for (const m of months) {
    acc.gross += m.totals.gross;
    acc.tax += m.totals.tax;
    acc.partnerFee += m.totals.partnerFee;
    acc.commission += m.totals.commission;
    acc.net += m.totals.net;
  }
  return {
    gross: round2(acc.gross),
    tax: round2(acc.tax),
    partnerFee: round2(acc.partnerFee),
    commission: round2(acc.commission),
    net: round2(acc.net),
  };
}
