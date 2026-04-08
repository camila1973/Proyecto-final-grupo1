import { Injectable, Inject } from "@nestjs/common";
import { Kysely } from "kysely";
import { KYSELY } from "../database/database.provider.js";
import { Database } from "../database/database.types.js";

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
}
