import { Injectable, Logger } from "@nestjs/common";
import { PropertiesRepository } from "../../properties/properties.repository.js";
import { BookingClientService } from "../../booking/booking-client.service.js";

export interface TaxRuleUpsertedPayload {
  ruleId: string;
  country: string;
  city?: string;
  taxName: string;
  taxType: string;
  rate?: number;
  flatAmount?: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

@Injectable()
export class TaxRuleUpsertedHandler {
  private readonly logger = new Logger(TaxRuleUpsertedHandler.name);

  constructor(
    private readonly repo: PropertiesRepository,
    private readonly bookingClient: BookingClientService,
  ) {}

  async handle(payload: TaxRuleUpsertedPayload): Promise<void> {
    const city = payload.city ?? "";

    // Re-query booking-service for all tax rules for this country, then apply
    // the city-wins precedence and sum only PERCENTAGE winners. This avoids the
    // stale-accumulation bug where updating a rule would double-count its rate.
    const allRules = await this.bookingClient.getTaxRules(payload.country);
    const activeRules = allRules.filter((r) => r.is_active);

    // Apply city-wins precedence (same logic as resolveRules in booking-service)
    const byName = new Map<string, (typeof activeRules)[number]>();
    for (const r of activeRules) if (r.city === null) byName.set(r.tax_name, r);
    for (const r of activeRules) if (r.city !== null) byName.set(r.tax_name, r);

    // Sum only PERCENTAGE rules for the (country, city) pair
    // City-level rules apply only to their city; country-level rules apply everywhere.
    // We maintain one total per (country, city) cache entry, so we sum only the
    // rules that match this event's city scope.
    const normalizedCity = city.toLowerCase();
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
      `Recomputed tax rate for ${payload.country}/${city} → ${totalPct}%`,
    );
  }
}
