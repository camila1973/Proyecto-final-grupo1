import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider.js";
import {
  Database,
  PartnerFeeRow,
  NewPartnerFee,
} from "../database/database.types.js";

export interface PartnerFee {
  id: string;
  partner_id: string;
  property_id: string | null;
  fee_name: string;
  fee_type: string;
  rate: string | null;
  flat_amount: string | null;
  currency: string;
}

interface PartnerFeeEventPayload {
  feeId: string;
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
export class PartnerFeesRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findApplicable(
    partnerId: string,
    propertyId: string,
    checkIn: Date,
    checkOut: Date,
  ): Promise<PartnerFee[]> {
    const checkInStr = checkIn.toISOString().slice(0, 10);
    const checkOutStr = checkOut.toISOString().slice(0, 10);

    const rows = await this.db
      .selectFrom("partner_fees")
      .where("partner_id", "=", partnerId)
      .where("is_active", "=", true)
      .where("effective_from", "<=", checkInStr)
      .where((eb) =>
        eb.or([
          eb("effective_to", "is", null),
          eb("effective_to", ">=", checkOutStr),
        ]),
      )
      .where((eb) =>
        eb.or([
          eb("property_id", "is", null),
          eb("property_id", "=", propertyId),
        ]),
      )
      .select([
        "id",
        "partner_id",
        "property_id",
        "fee_name",
        "fee_type",
        "rate",
        "flat_amount",
        "currency",
      ])
      .execute();

    return rows as PartnerFee[];
  }

  async upsert(data: NewPartnerFee & { id?: string }): Promise<PartnerFeeRow> {
    if (data.id) {
      const row = await this.db
        .updateTable("partner_fees")
        .set({
          partner_id: data.partner_id,
          property_id: data.property_id,
          fee_name: data.fee_name,
          fee_type: data.fee_type,
          rate: data.rate,
          flat_amount: data.flat_amount,
          currency: data.currency,
          effective_from: data.effective_from,
          effective_to: data.effective_to,
          updated_at: new Date(),
        })
        .where("id", "=", data.id)
        .returningAll()
        .executeTakeFirst();
      if (!row) throw new NotFoundException(`Partner fee ${data.id} not found`);
      return row;
    }

    const row = await this.db
      .insertInto("partner_fees")
      .values({
        partner_id: data.partner_id,
        property_id: data.property_id,
        fee_name: data.fee_name,
        fee_type: data.fee_type,
        rate: data.rate,
        flat_amount: data.flat_amount,
        currency: data.currency,
        effective_from: data.effective_from,
        effective_to: data.effective_to,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return row;
  }

  async findAll(partnerId: string): Promise<PartnerFeeRow[]> {
    return this.db
      .selectFrom("partner_fees")
      .selectAll()
      .where("partner_id", "=", partnerId)
      .execute();
  }

  async findById(id: string): Promise<PartnerFeeRow> {
    const row = await this.db
      .selectFrom("partner_fees")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!row) throw new NotFoundException(`Partner fee ${id} not found`);
    return row;
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .updateTable("partner_fees")
      .set({ is_active: false, updated_at: new Date() })
      .where("id", "=", id)
      .execute();
  }

  async upsertFromEvent(event: PartnerFeeEventPayload): Promise<void> {
    await this.db
      .insertInto("partner_fees")
      .values({
        id: event.feeId,
        partner_id: event.partnerId,
        property_id: event.propertyId ?? null,
        fee_name: event.feeName,
        fee_type: event.feeType,
        rate: event.rate ?? null,
        flat_amount: event.flatAmount ?? null,
        currency: event.currency,
        effective_from: event.effectiveFrom,
        effective_to: event.effectiveTo ?? null,
        is_active: true,
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({
          partner_id: event.partnerId,
          property_id: event.propertyId ?? null,
          fee_name: event.feeName,
          fee_type: event.feeType,
          rate: event.rate ?? null,
          flat_amount: event.flatAmount ?? null,
          currency: event.currency,
          effective_from: event.effectiveFrom,
          effective_to: event.effectiveTo ?? null,
          is_active: true,
          updated_at: new Date(),
        }),
      )
      .execute();
  }
}
