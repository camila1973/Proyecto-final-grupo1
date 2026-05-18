import { Injectable, Logger } from "@nestjs/common";
import { ReservationsRepository } from "./reservations.repository.js";
import { ReservationsService } from "./reservations.service.js";
import { CacheService } from "../cache/cache.service.js";

const LOCK_KEY = "booking:no-show:lock";
const LOCK_TTL_SECONDS = 3_700; // covers an hourly cadence with buffer

export interface MarkNoShowsResult {
  processed: number;
  skipped: boolean;
}

@Injectable()
export class NoShowService {
  private readonly logger = new Logger(NoShowService.name);

  constructor(
    private readonly reservationsRepo: ReservationsRepository,
    private readonly reservationsService: ReservationsService,
    private readonly cache: CacheService,
  ) {}

  // Invoked by Cloud Scheduler via POST /internal/reservations/mark-no-shows.
  // The Redis lock guards against duplicate executions when Cloud Scheduler
  // retries on transient failures.
  async markStaleConfirmedAsNoShow(): Promise<MarkNoShowsResult> {
    const acquired = await this.cache.acquireLock(LOCK_KEY, LOCK_TTL_SECONDS);
    if (!acquired) return { processed: 0, skipped: true };

    const stale = await this.reservationsRepo.findStaleConfirmed();
    let processed = 0;

    for (const row of stale) {
      try {
        await this.reservationsService.noShow(row.id);
        processed += 1;
      } catch (err) {
        this.logger.warn(
          `Failed to mark reservation ${row.id} as no_show: ${err}`,
        );
      }
    }

    return { processed, skipped: false };
  }
}
