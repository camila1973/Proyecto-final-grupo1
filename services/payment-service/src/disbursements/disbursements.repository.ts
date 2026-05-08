import { Inject, Injectable } from "@nestjs/common";
import { Kysely, sql } from "kysely";
import {
  Database,
  DisbursementRow,
  NewDisbursementItem,
} from "../database/database.types.js";
import { KYSELY } from "../database/database.provider.js";

export interface CapturedPaymentForPeriod {
  payment_id: string;
  property_id: string;
  property_name: string;
  gross_amount_usd: string;
  tax_amount_usd: string;
  partner_fee_usd: string;
  commission_amount_usd: string;
  net_payout_usd: string;
}

@Injectable()
export class DisbursementsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findByPeriod(
    partnerId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<DisbursementRow | undefined> {
    return this.db
      .selectFrom("disbursements")
      .selectAll()
      .where("partner_id", "=", partnerId)
      .where("period_start", "=", periodStart)
      .where("period_end", "=", periodEnd)
      .executeTakeFirst();
  }

  // Captured payments for a partner whose capture timestamp falls in the period.
  // Used both for lazy materialization (past months) and on-the-fly aggregation
  // (current month).
  async findCapturedInPeriod(
    partnerId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<CapturedPaymentForPeriod[]> {
    return this.db
      .selectFrom("payments")
      .select([
        "id as payment_id",
        sql<string>`coalesce(property_id::text, '')`.as("property_id"),
        sql<string>`coalesce(property_name, '')`.as("property_name"),
        sql<string>`coalesce(gross_amount_usd, amount_usd)`.as(
          "gross_amount_usd",
        ),
        sql<string>`coalesce(tax_amount_usd, 0)`.as("tax_amount_usd"),
        sql<string>`coalesce(partner_fee_usd, 0)`.as("partner_fee_usd"),
        sql<string>`coalesce(commission_amount_usd, 0)`.as(
          "commission_amount_usd",
        ),
        sql<string>`coalesce(net_payout_usd, amount_usd)`.as("net_payout_usd"),
      ])
      .where("partner_id", "=", partnerId)
      .where("status", "=", "captured")
      .where("captured_at", ">=", new Date(`${periodStart}T00:00:00Z`))
      .where("captured_at", "<", new Date(`${periodEnd}T00:00:00Z`))
      .execute();
  }

  // Insert-or-ignore: returns the existing or newly-created row.
  async upsertHeader(input: {
    partnerId: string;
    periodStart: string;
    periodEnd: string;
    scheduledFor: string;
  }): Promise<DisbursementRow> {
    await this.db
      .insertInto("disbursements")
      .values({
        partner_id: input.partnerId,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        scheduled_for: input.scheduledFor,
      })
      .onConflict((oc) =>
        oc.columns(["partner_id", "period_start", "period_end"]).doNothing(),
      )
      .execute();

    const row = await this.findByPeriod(
      input.partnerId,
      input.periodStart,
      input.periodEnd,
    );
    if (!row) {
      throw new Error(
        `Failed to upsert disbursement for ${input.partnerId} ${input.periodStart}/${input.periodEnd}`,
      );
    }
    return row;
  }

  async writeItemsAndTotals(
    disbursementId: string,
    items: NewDisbursementItem[],
    totals: {
      grossTotal: number;
      taxTotal: number;
      partnerFeeTotal: number;
      commissionTotal: number;
      netTotal: number;
    },
  ): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      await trx
        .deleteFrom("disbursement_items")
        .where("disbursement_id", "=", disbursementId)
        .execute();

      if (items.length > 0) {
        await trx.insertInto("disbursement_items").values(items).execute();
      }

      await trx
        .updateTable("disbursements")
        .set({
          gross_total_usd: String(totals.grossTotal),
          tax_total_usd: String(totals.taxTotal),
          partner_fee_total_usd: String(totals.partnerFeeTotal),
          commission_total_usd: String(totals.commissionTotal),
          net_total_usd: String(totals.netTotal),
          updated_at: new Date(),
        })
        .where("id", "=", disbursementId)
        .execute();
    });
  }
}
