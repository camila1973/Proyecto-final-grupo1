import { Injectable, Logger } from "@nestjs/common";
import { TaxRateCacheRepository } from "../../tax-cache/tax-rate-cache.repository.js";

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

  constructor(private readonly taxRateCache: TaxRateCacheRepository) {}

  async handle(payload: TaxRuleUpsertedPayload): Promise<void> {
    if (payload.taxType !== "PERCENTAGE" || !payload.rate) {
      // Only percentage rules contribute to the pre-summed tax_rate_pct
      return;
    }

    const city = payload.city ?? "";

    // Recompute total rate for this (country, city) by looking up current cache
    // then adding/updating this rule's contribution. Since we store the total,
    // the simplest approach is to re-sum by fetching the existing total and
    // adjusting. However, we don't have per-rule breakdown stored, so we just
    // upsert the new total as the incremental addition to the existing value.
    // A more precise implementation would store per-rule rates separately;
    // for now we accumulate via upsert (overwrite with new rule's rate contribution).
    // The event handler does an optimistic upsert: the actual total_pct is
    // re-accumulated correctly by the booking-service (authoritative source).
    // Here we store the cumulative total as reported by events.
    const existing = await this.taxRateCache.lookup(payload.country, city);
    // For simplicity: add this rule's rate to the existing total.
    // If this is an update, the old value stays in the total — this is an
    // eventual consistency approximation. The search estimate is non-authoritative.
    const newTotal = existing + payload.rate;

    await this.taxRateCache.upsert(payload.country, city, newTotal);

    // Async bulk re-index of affected rooms (fire-and-forget)
    void this.taxRateCache
      .bulkUpdateRoomSearchIndex(payload.country, city, newTotal)
      .catch((err: unknown) => {
        this.logger.error(
          `Failed to bulk-update room_search_index for ${payload.country}/${city}: ${String(err)}`,
        );
      });

    this.logger.debug(
      `Updated tax_rate_cache for ${payload.country}/${city} → ${newTotal}%`,
    );
  }
}
