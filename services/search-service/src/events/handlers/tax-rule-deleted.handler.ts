import { Injectable, Logger } from "@nestjs/common";
import { PropertiesRepository } from "../../properties/properties.repository.js";
import { BookingClientService } from "../../booking/booking-client.service.js";

export interface TaxRuleDeletedPayload {
  ruleId: string;
  country: string;
  city?: string;
}

@Injectable()
export class TaxRuleDeletedHandler {
  private readonly logger = new Logger(TaxRuleDeletedHandler.name);

  constructor(
    private readonly repo: PropertiesRepository,
    private readonly bookingClient: BookingClientService,
  ) {}

  async handle(payload: TaxRuleDeletedPayload): Promise<void> {
    const city = payload.city ?? "";
    const normalizedCity = city.toLowerCase();

    // Re-query booking-service for remaining active rules and recompute the total.
    // The deleted rule will already be inactive in booking-service, so the new
    // total correctly excludes it.
    const allRules = await this.bookingClient.getTaxRules(payload.country);
    const activeRules = allRules.filter((r) => r.is_active);

    const byName = new Map<string, (typeof activeRules)[number]>();
    for (const r of activeRules) if (r.city === null) byName.set(r.tax_name, r);
    for (const r of activeRules) if (r.city !== null) byName.set(r.tax_name, r);

    const winners = [...byName.values()].filter(
      (r) =>
        r.tax_type === "PERCENTAGE" &&
        (r.city === null || r.city.toLowerCase() === normalizedCity),
    );
    const totalPct = winners.reduce(
      (acc, r) => acc + parseFloat(r.rate ?? "0"),
      0,
    );

    void this.repo
      .bulkUpdateRoomSearchIndex(payload.country, normalizedCity, totalPct)
      .catch((err: unknown) => {
        this.logger.error(
          `Failed to bulk-update room_search_index for ${payload.country}/${city}: ${String(err)}`,
        );
      });

    this.logger.debug(
      `Recomputed tax rate for ${payload.country}/${city} → ${totalPct}% (rule ${payload.ruleId} deleted)`,
    );
  }
}
