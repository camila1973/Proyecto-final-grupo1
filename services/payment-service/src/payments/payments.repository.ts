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
    },
  ): Promise<void> {
    await this.db
      .updateTable("payments")
      .set({ ...updates, updated_at: new Date() })
      .where("stripe_payment_intent_id", "=", intentId)
      .execute();
  }
}
