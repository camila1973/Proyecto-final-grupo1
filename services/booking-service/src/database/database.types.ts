import { ColumnType, Generated, Insertable, Selectable } from "kysely";

// DATE columns: pg returns 'YYYY-MM-DD' strings; accept Date or string on insert/update
type DateColumn = ColumnType<string, Date | string, Date | string>;
type NullableDateColumn = ColumnType<
  string | null,
  Date | string | null | undefined,
  Date | string | null | undefined
>;
type NumericColumn = ColumnType<
  string | null,
  number | string | null | undefined,
  number | string | null | undefined
>;

export interface TaxRulesTable {
  id: Generated<string>;
  country: string;
  city: ColumnType<
    string | null,
    string | null | undefined,
    string | null | undefined
  >;
  tax_name: string;
  tax_type: string; // "PERCENTAGE" | "FLAT_PER_NIGHT" | "FLAT_PER_STAY"
  rate: NumericColumn;
  flat_amount: NumericColumn;
  currency: Generated<string>; // DEFAULT 'USD'
  applies_to: Generated<string>; // DEFAULT 'ROOM_RATE'
  effective_from: DateColumn;
  effective_to: NullableDateColumn;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface PartnerFeesTable {
  id: Generated<string>;
  partner_id: string;
  property_id: ColumnType<
    string | null,
    string | null | undefined,
    string | null | undefined
  >;
  fee_name: string;
  fee_type: string; // "PERCENTAGE" | "FLAT_PER_NIGHT" | "FLAT_PER_STAY"
  rate: NumericColumn;
  flat_amount: NumericColumn;
  currency: Generated<string>; // DEFAULT 'USD'
  effective_from: DateColumn;
  effective_to: NullableDateColumn;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ReservationsTable {
  id: Generated<string>;
  property_id: string;
  room_id: string;
  partner_id: string;
  guest_id: string;
  check_in: DateColumn;
  check_out: DateColumn;
  status: Generated<string>; // DEFAULT 'pending'
  fare_breakdown: ColumnType<
    Record<string, unknown> | null,
    object | null | undefined,
    object | null | undefined
  >;
  tax_total_usd: NumericColumn;
  fee_total_usd: NumericColumn;
  grand_total_usd: NumericColumn;
  hold_expires_at: ColumnType<
    Date | null,
    Date | null | undefined,
    Date | null | undefined
  >;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface Database {
  tax_rules: TaxRulesTable;
  partner_fees: PartnerFeesTable;
  reservations: ReservationsTable;
}

export type TaxRuleRow = Selectable<TaxRulesTable>;
export type NewTaxRule = Omit<
  Insertable<TaxRulesTable>,
  "id" | "created_at" | "updated_at"
>;

export type PartnerFeeRow = Selectable<PartnerFeesTable>;
export type NewPartnerFee = Omit<
  Insertable<PartnerFeesTable>,
  "id" | "created_at" | "updated_at"
>;

export type ReservationRow = Selectable<ReservationsTable>;
export type NewReservation = Omit<
  Insertable<ReservationsTable>,
  "id" | "created_at" | "updated_at"
>;
