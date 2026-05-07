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

type RequiredNumericColumn = ColumnType<
  string,
  number | string,
  number | string | null | undefined
>;

type NullableText = ColumnType<
  string | null,
  string | null | undefined,
  string | null | undefined
>;

type DateColumn = ColumnType<string, Date | string, Date | string>;

type NullableDateColumn = ColumnType<
  string | null,
  Date | string | null | undefined,
  Date | string | null | undefined
>;

type NullableTimestampColumn = ColumnType<
  Date | null,
  Date | string | null | undefined,
  Date | string | null | undefined
>;

type JsonbColumn<T> = ColumnType<T, T, T>;

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

  // Snapshot columns — populated at initiate time so every payment row
  // carries a self-contained audit record. Nullable in the DB only because
  // the migration is additive; the service writes all of them on insert.
  partner_id: ColumnType<
    string | null,
    string | null | undefined,
    string | null | undefined
  >;
  property_id: ColumnType<
    string | null,
    string | null | undefined,
    string | null | undefined
  >;
  property_name: NullableText;
  gross_amount_usd: NumericColumn;
  tax_amount_usd: NumericColumn;
  partner_fee_usd: NumericColumn;
  commission_rate: NumericColumn;
  commission_amount_usd: NumericColumn;
  net_payout_usd: NumericColumn;
  fare_snapshot: ColumnType<
    Record<string, unknown> | null,
    object | null | undefined,
    object | null | undefined
  >;
  captured_at: NullableTimestampColumn;

  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface CommissionRulesTable {
  id: Generated<string>;
  partner_id: ColumnType<
    string | null,
    string | null | undefined,
    string | null | undefined
  >;
  rate: RequiredNumericColumn;
  effective_from: DateColumn;
  effective_to: NullableDateColumn;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface DisbursementsTable {
  id: Generated<string>;
  partner_id: string;
  period_start: DateColumn;
  period_end: DateColumn;
  scheduled_for: DateColumn;
  currency: Generated<string>;
  gross_total_usd: Generated<string>;
  tax_total_usd: Generated<string>;
  partner_fee_total_usd: Generated<string>;
  commission_total_usd: Generated<string>;
  net_total_usd: Generated<string>;
  status: Generated<string>; // pending | paid | failed
  paid_at: NullableTimestampColumn;
  failure_reason: NullableText;
  external_transfer_ref: NullableText;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface DisbursementItemsTable {
  disbursement_id: string;
  payment_id: string;
  property_id: string;
  property_name: string;
  gross_amount_usd: RequiredNumericColumn;
  tax_amount_usd: RequiredNumericColumn;
  partner_fee_usd: RequiredNumericColumn;
  commission_amount_usd: RequiredNumericColumn;
  net_payout_usd: RequiredNumericColumn;
  created_at: Generated<Date>;
}

export interface PaymentAdjustmentsTable {
  id: Generated<string>;
  payment_id: string;
  kind: string; // refund | dispute | manual
  amount_usd: RequiredNumericColumn;
  applied_at: Generated<Date>;
  external_ref: NullableText;
  reason: NullableText;
  created_at: Generated<Date>;
}

export interface FareSnapshot {
  nights: number;
  roomRateUsd: number;
  subtotalUsd: number;
  taxes: Array<{
    name: string;
    type: string;
    rate?: number | null;
    amountUsd: number;
  }>;
  fees: Array<{
    name: string;
    type: string;
    rate?: number | null;
    amountUsd: number;
    totalUsd?: number;
  }>;
  taxTotalUsd: number;
  feeTotalUsd: number;
  totalUsd: number;
}

export type PaymentFareSnapshotColumn = JsonbColumn<FareSnapshot | null>;

export interface Database {
  payments: PaymentsTable;
  commission_rules: CommissionRulesTable;
  disbursements: DisbursementsTable;
  disbursement_items: DisbursementItemsTable;
  payment_adjustments: PaymentAdjustmentsTable;
}

export type PaymentRow = Selectable<PaymentsTable>;
export type NewPayment = Omit<
  Insertable<PaymentsTable>,
  "id" | "created_at" | "updated_at"
>;
export type PaymentUpdate = Updateable<PaymentsTable>;

export type CommissionRuleRow = Selectable<CommissionRulesTable>;
export type NewCommissionRule = Omit<
  Insertable<CommissionRulesTable>,
  "id" | "created_at" | "updated_at"
>;

export type DisbursementRow = Selectable<DisbursementsTable>;
export type NewDisbursement = Omit<
  Insertable<DisbursementsTable>,
  "id" | "created_at" | "updated_at"
>;
export type DisbursementUpdate = Updateable<DisbursementsTable>;

export type DisbursementItemRow = Selectable<DisbursementItemsTable>;
export type NewDisbursementItem = Omit<
  Insertable<DisbursementItemsTable>,
  "created_at"
>;

export type PaymentAdjustmentRow = Selectable<PaymentAdjustmentsTable>;
export type NewPaymentAdjustment = Omit<
  Insertable<PaymentAdjustmentsTable>,
  "id" | "applied_at" | "created_at"
> & { applied_at?: Date | string };
