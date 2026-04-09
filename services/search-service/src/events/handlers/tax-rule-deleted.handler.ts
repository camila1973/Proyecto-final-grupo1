import { Injectable, Logger } from "@nestjs/common";
import { TaxRateCacheRepository } from "../../tax-cache/tax-rate-cache.repository.js";

export interface TaxRuleDeletedPayload {
  ruleId: string;
  country: string;
  city?: string;
}

@Injectable()
export class TaxRuleDeletedHandler {
  private readonly logger = new Logger(TaxRuleDeletedHandler.name);

  constructor(private readonly taxRateCache: TaxRateCacheRepository) {}

  async handle(payload: TaxRuleDeletedPayload): Promise<void> {
    const city = payload.city ?? "";

    // Remove the tax_rate_cache entry for this location.
    // A future tax.rule.upserted event for surviving rules will rebuild the total.
    // For now, zero it out so search shows 0% until rebuilt.
    await this.taxRateCache.delete(payload.country, city);

    // Async bulk update of room_search_index to reflect 0% rate
    void this.taxRateCache
      .bulkUpdateRoomSearchIndex(payload.country, city, 0)
      .catch((err: unknown) => {
        this.logger.error(
          `Failed to bulk-update room_search_index for ${payload.country}/${city}: ${String(err)}`,
        );
      });

    this.logger.debug(
      `Cleared tax_rate_cache for ${payload.country}/${city} (rule ${payload.ruleId} deleted)`,
    );
  }
}
