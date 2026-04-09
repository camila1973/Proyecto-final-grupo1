import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider.js";
import {
  Database,
  TaxRuleRow,
  NewTaxRule,
} from "../database/database.types.js";

export interface TaxRule {
  id: string;
  country: string;
  city: string | null;
  tax_name: string;
  tax_type: string;
  rate: string | null;
  flat_amount: string | null;
  currency: string;
}

type UpdateTaxRuleData = Partial<
  Pick<
    NewTaxRule,
    | "country"
    | "city"
    | "tax_name"
    | "tax_type"
    | "rate"
    | "flat_amount"
    | "currency"
    | "effective_from"
    | "effective_to"
    | "is_active"
  >
>;

/**
 * Applies city-wins precedence to a set of tax rules.
 * Rules with different tax_name values are all cumulative.
 * When the same tax_name appears at both country and city level, city wins.
 */
export function resolveRules(rows: TaxRule[]): TaxRule[] {
  const byName = new Map<string, TaxRule>();
  for (const r of rows) if (r.city === null) byName.set(r.tax_name, r);
  for (const r of rows) if (r.city !== null) byName.set(r.tax_name, r);
  return [...byName.values()];
}

@Injectable()
export class TaxRulesRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  async findApplicable(
    country: string,
    city: string,
    stayDate: Date,
  ): Promise<TaxRule[]> {
    const stayDateStr = stayDate.toISOString().slice(0, 10);
    const normalizedCity = city.toLowerCase();

    const rows = await this.db
      .selectFrom("tax_rules")
      .where("country", "=", country)
      .where("is_active", "=", true)
      .where("effective_from", "<=", stayDateStr)
      .where((eb) =>
        eb.or([
          eb("effective_to", "is", null),
          eb("effective_to", ">=", stayDateStr),
        ]),
      )
      .where((eb) =>
        eb.or([eb("city", "is", null), eb("city", "=", normalizedCity)]),
      )
      .select([
        "id",
        "country",
        "city",
        "tax_name",
        "tax_type",
        "rate",
        "flat_amount",
        "currency",
      ])
      .execute();

    return resolveRules(rows as TaxRule[]);
  }

  async insert(data: NewTaxRule): Promise<TaxRuleRow> {
    const row = await this.db
      .insertInto("tax_rules")
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();
    return row;
  }

  async findAll(country?: string): Promise<TaxRuleRow[]> {
    let query = this.db.selectFrom("tax_rules").selectAll();
    if (country) {
      query = query.where("country", "=", country);
    }
    return query.execute();
  }

  async findById(id: string): Promise<TaxRuleRow> {
    const row = await this.db
      .selectFrom("tax_rules")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!row) throw new NotFoundException(`Tax rule ${id} not found`);
    return row;
  }

  async update(id: string, data: UpdateTaxRuleData): Promise<TaxRuleRow> {
    const row = await this.db
      .updateTable("tax_rules")
      .set({ ...data, updated_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    if (!row) throw new NotFoundException(`Tax rule ${id} not found`);
    return row;
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .updateTable("tax_rules")
      .set({ is_active: false, updated_at: new Date() })
      .where("id", "=", id)
      .execute();
  }
}
