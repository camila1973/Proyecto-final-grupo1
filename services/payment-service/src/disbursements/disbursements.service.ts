import { Injectable } from "@nestjs/common";
import {
  CapturedPaymentForPeriod,
  DisbursementsRepository,
} from "./disbursements.repository.js";
import { DisbursementRow } from "../database/database.types.js";
import { DisbursementResponse, PropertyRollup } from "./disbursements.types.js";

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
