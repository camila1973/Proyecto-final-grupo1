import { Inject, Injectable } from "@nestjs/common";
import { Kysely } from "kysely";
import {
  Database,
  NewPaymentAdjustment,
  PaymentAdjustmentRow,
} from "../database/database.types.js";
import { KYSELY } from "../database/database.provider.js";

@Injectable()
export class RefundsRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async insert(data: NewPaymentAdjustment): Promise<PaymentAdjustmentRow> {
    const [row] = await this.db
      .insertInto("payment_adjustments")
      .values(data)
      .returningAll()
      .execute();
    return row;
  }

  async findByPaymentId(paymentId: string): Promise<PaymentAdjustmentRow[]> {
    return this.db
      .selectFrom("payment_adjustments")
      .selectAll()
      .where("payment_id", "=", paymentId)
      .orderBy("applied_at", "desc")
      .execute();
  }
}
