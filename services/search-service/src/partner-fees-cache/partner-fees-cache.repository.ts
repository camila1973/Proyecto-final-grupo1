import { Injectable, Inject } from "@nestjs/common";
import { Kysely, sql } from "kysely";
import type { SearchDatabase } from "../database/database.types.js";
import { KYSELY } from "../database/database.provider.js";

interface PartnerFeeCacheData {
  id: string;
  partnerId: string;
  propertyId?: string;
  feeName: string;
  feeType: string;
  rate?: number;
  flatAmount?: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

@Injectable()
export class PartnerFeesCacheRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<SearchDatabase>) {}

  async upsert(data: PartnerFeeCacheData): Promise<void> {
    await sql`
      INSERT INTO partner_fees_cache
        (id, partner_id, property_id, fee_name, fee_type, rate, flat_amount,
         currency, effective_from, effective_to, is_active)
      VALUES (
        ${data.id}::uuid,
        ${data.partnerId}::uuid,
        ${data.propertyId ?? null}::uuid,
        ${data.feeName},
        ${data.feeType},
        ${data.rate ?? null},
        ${data.flatAmount ?? null},
        ${data.currency},
        ${data.effectiveFrom}::date,
        ${data.effectiveTo ?? null}::date,
        true
      )
      ON CONFLICT (id) DO UPDATE SET
        partner_id     = EXCLUDED.partner_id,
        property_id    = EXCLUDED.property_id,
        fee_name       = EXCLUDED.fee_name,
        fee_type       = EXCLUDED.fee_type,
        rate           = EXCLUDED.rate,
        flat_amount    = EXCLUDED.flat_amount,
        currency       = EXCLUDED.currency,
        effective_from = EXCLUDED.effective_from,
        effective_to   = EXCLUDED.effective_to,
        is_active      = true
    `.execute(this.db);
  }

  async softDelete(feeId: string): Promise<void> {
    await this.db
      .updateTable("partner_fees_cache")
      .set({ is_active: false })
      .where("id", "=", feeId)
      .execute();
  }

  async getPartnersWithActiveFlatFees(
    partnerIds: string[],
  ): Promise<Set<string>> {
    if (partnerIds.length === 0) return new Set();
    const rows = await this.db
      .selectFrom("partner_fees_cache")
      .select("partner_id")
      .where("is_active", "=", true)
      .where("fee_type", "in", ["FLAT_PER_NIGHT", "FLAT_PER_STAY"])
      .where("partner_id", "in", partnerIds)
      .execute();
    return new Set(rows.map((r) => r.partner_id));
  }

  async getFlatFeeTotals(
    partnerIds: string[],
    checkIn: string,
    checkOut: string,
  ): Promise<Map<string, number>> {
    if (partnerIds.length === 0) return new Map();

    const nights = this.calcNights(checkIn, checkOut);
    if (nights <= 0) return new Map();

    const rows = await this.db
      .selectFrom("partner_fees_cache")
      .select(["partner_id", "fee_type", "flat_amount", "currency"])
      .where("is_active", "=", true)
      .where("fee_type", "in", ["FLAT_PER_NIGHT", "FLAT_PER_STAY"])
      .where("partner_id", "in", partnerIds)
      .where("currency", "=", "USD")
      .where("effective_from", "<=", checkIn)
      .where((eb) =>
        eb.or([
          eb("effective_to", "is", null),
          eb("effective_to", ">=", checkOut),
        ]),
      )
      .execute();

    const totals = new Map<string, number>();
    for (const row of rows) {
      if (!row.flat_amount) continue;
      const amount = parseFloat(row.flat_amount);
      const contribution =
        row.fee_type === "FLAT_PER_NIGHT" ? amount * nights : amount;
      totals.set(
        row.partner_id,
        (totals.get(row.partner_id) ?? 0) + contribution,
      );
    }
    return totals;
  }

  private calcNights(checkIn: string, checkOut: string): number {
    const inMs = new Date(checkIn).getTime();
    const outMs = new Date(checkOut).getTime();
    return Math.max(0, Math.round((outMs - inMs) / (1000 * 60 * 60 * 24)));
  }
}
