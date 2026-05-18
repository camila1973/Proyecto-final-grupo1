import { Injectable, Logger } from "@nestjs/common";
import { ReservationsRepository } from "./reservations.repository.js";
import { InventoryClient } from "../clients/inventory.client.js";
import { CacheService } from "../cache/cache.service.js";

const LOCK_KEY = "booking:hold-expiry:lock";
const LOCK_TTL_SECONDS = 70; // covers a generous run-time window

export interface ExpireHoldsResult {
  processed: number;
  skipped: boolean;
}

@Injectable()
export class HoldExpiryService {
  private readonly logger = new Logger(HoldExpiryService.name);

  constructor(
    private readonly reservationsRepo: ReservationsRepository,
    private readonly inventoryClient: InventoryClient,
    private readonly cache: CacheService,
  ) {}

  // Invoked by Cloud Scheduler via POST /internal/reservations/expire-holds.
  // The Redis lock guards against duplicate executions when Cloud Scheduler
  // retries on transient failures.
  async expireHolds(): Promise<ExpireHoldsResult> {
    const acquired = await this.cache.acquireLock(LOCK_KEY, LOCK_TTL_SECONDS);
    if (!acquired) return { processed: 0, skipped: true };

    const expired = await this.reservationsRepo.findExpiredHolds();
    let processed = 0;

    for (const row of expired) {
      const updated = await this.reservationsRepo.expire(
        row.id,
        "hold ttl elapsed",
      );
      if (!updated) {
        // Row was confirmed (or already expired) between the query and the update
        continue;
      }

      try {
        await this.inventoryClient.unhold(
          row.room_id,
          row.check_in,
          row.check_out,
        );
        processed += 1;
      } catch (err) {
        this.logger.warn(
          `Failed to unhold inventory for expired reservation ${row.id}: ${err}`,
        );
      }
    }

    return { processed, skipped: false };
  }
}
