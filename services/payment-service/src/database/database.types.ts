import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

type NumericColumn = ColumnType<
  string | null,
  number | string | null | undefined,
  number | string | null | undefined
>;

type NullableText = ColumnType<
  string | null,
  string | null | undefined,
  string | null | undefined
>;

export interface PaymentsTable {
  id: Generated<string>;
  reservation_id: string;
  stripe_payment_intent_id: string;
  stripe_payment_method_id: NullableText;
  amount_usd: NumericColumn;
  currency: Generated<string>;
  status: Generated<string>; // pending | captured | failed
  failure_reason: NullableText;
  guest_email: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface Database {
  payments: PaymentsTable;
}

export type PaymentRow = Selectable<PaymentsTable>;
export type NewPayment = Omit<
  Insertable<PaymentsTable>,
  "id" | "created_at" | "updated_at"
>;
export type PaymentUpdate = Updateable<PaymentsTable>;
