import { Inject, Injectable } from "@nestjs/common";
import { Kysely } from "kysely";
import {
  Database,
  NewPayment,
  PaymentRow,
} from "../database/database.types.js";
import { KYSELY } from "../database/database.provider.js";

@Injectable()
export class PaymentsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async create(data: NewPayment): Promise<PaymentRow> {
    const [row] = await this.db
      .insertInto("payments")
      .values(data)
      .returningAll()
      .execute();
    return row;
  }

  async findByReservationId(
    reservationId: string,
  ): Promise<PaymentRow | undefined> {
    return this.db
      .selectFrom("payments")
      .selectAll()
      .where("reservation_id", "=", reservationId)
      .orderBy("created_at", "desc")
      .executeTakeFirst();
  }

  async findByIntentId(intentId: string): Promise<PaymentRow | undefined> {
    return this.db
      .selectFrom("payments")
      .selectAll()
      .where("stripe_payment_intent_id", "=", intentId)
      .executeTakeFirst();
  }

  async updateByIntentId(
    intentId: string,
    updates: {
      status: string;
      stripe_payment_method_id?: string | null;
      failure_reason?: string | null;
      captured_at?: Date | null;
    },
  ): Promise<void> {
    await this.db
      .updateTable("payments")
      .set({ ...updates, updated_at: new Date() })
      .where("stripe_payment_intent_id", "=", intentId)
      .execute();
  }

  // Range scan for partner financial reports. `from` inclusive, `to` exclusive.
  // Uses the partial index payments_partner_captured_idx (partner_id, captured_at)
  // WHERE status = 'captured'.
  async findCapturedByPartner(
    partnerId: string,
    from: Date,
    to: Date,
    propertyId?: string,
  ): Promise<PaymentRow[]> {
    let query = this.db
      .selectFrom("payments")
      .selectAll()
      .where("partner_id", "=", partnerId)
      .where("status", "=", "captured")
      .where("captured_at", ">=", from)
      .where("captured_at", "<", to);
    if (propertyId) {
      query = query.where("property_id", "=", propertyId);
    }
    return query.orderBy("captured_at", "asc").execute();
  }
}
