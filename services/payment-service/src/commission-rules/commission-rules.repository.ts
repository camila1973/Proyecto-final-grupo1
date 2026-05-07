import { Inject, Injectable } from "@nestjs/common";
import { Kysely } from "kysely";
import { CommissionRuleRow, Database } from "../database/database.types.js";
import { KYSELY } from "../database/database.provider.js";

@Injectable()
export class CommissionRulesRepository {
  constructor(@Inject(KYSELY) private readonly db: Kysely<Database>) {}

  // Resolve the applicable rule for a partner at a given date.
  // Partner-specific rule wins; otherwise fall back to the global default
  // (partner_id IS NULL). Most recent effective_from breaks ties.
  async findApplicable(
    partnerId: string,
    onDate: string,
  ): Promise<CommissionRuleRow | undefined> {
    const partnerSpecific = await this.db
      .selectFrom("commission_rules")
      .selectAll()
      .where("partner_id", "=", partnerId)
      .where("is_active", "=", true)
      .where("effective_from", "<=", onDate)
      .where((eb) =>
        eb.or([
          eb("effective_to", "is", null),
          eb("effective_to", ">=", onDate),
        ]),
      )
      .orderBy("effective_from", "desc")
      .executeTakeFirst();

    if (partnerSpecific) return partnerSpecific;

    return this.db
      .selectFrom("commission_rules")
      .selectAll()
      .where("partner_id", "is", null)
      .where("is_active", "=", true)
      .where("effective_from", "<=", onDate)
      .where((eb) =>
        eb.or([
          eb("effective_to", "is", null),
          eb("effective_to", ">=", onDate),
        ]),
      )
      .orderBy("effective_from", "desc")
      .executeTakeFirst();
  }
}
