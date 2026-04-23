import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { ReservationsRepository } from "./reservations.repository.js";
import { InventoryClient } from "../clients/inventory.client.js";
import { CacheService } from "../cache/cache.service.js";

const EXPIRY_INTERVAL_MS = 60_000;
const LOCK_KEY = "booking:hold-expiry:lock";
const LOCK_TTL_SECONDS = 70; // interval + 10s buffer

@Injectable()
export class HoldExpiryService {
  private readonly logger = new Logger(HoldExpiryService.name);

  constructor(
    private readonly reservationsRepo: ReservationsRepository,
    private readonly inventoryClient: InventoryClient,
    private readonly cache: CacheService,
  ) {}

  @Interval(EXPIRY_INTERVAL_MS)
  async expireHolds(): Promise<void> {
    const acquired = await this.cache.acquireLock(LOCK_KEY, LOCK_TTL_SECONDS);
    if (!acquired) return;

    const expired = await this.reservationsRepo.findExpiredHolds();

    for (const row of expired) {
      const updated = await this.reservationsRepo.expire(row.id);
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
      } catch (err) {
        this.logger.warn(
          `Failed to unhold inventory for expired reservation ${row.id}: ${err}`,
        );
      }
    }
  }
}
