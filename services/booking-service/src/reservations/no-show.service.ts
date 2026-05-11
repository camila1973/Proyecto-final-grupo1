import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { ReservationsRepository } from "./reservations.repository.js";
import { ReservationsService } from "./reservations.service.js";
import { CacheService } from "../cache/cache.service.js";

const NO_SHOW_INTERVAL_MS = 3_600_000; // 1 hour
const LOCK_KEY = "booking:no-show:lock";
const LOCK_TTL_SECONDS = 3_700; // interval + 100s buffer

@Injectable()
export class NoShowService {
  private readonly logger = new Logger(NoShowService.name);

  constructor(
    private readonly reservationsRepo: ReservationsRepository,
    private readonly reservationsService: ReservationsService,
    private readonly cache: CacheService,
  ) {}

  @Interval(NO_SHOW_INTERVAL_MS)
  async markStaleConfirmedAsNoShow(): Promise<void> {
    const acquired = await this.cache.acquireLock(LOCK_KEY, LOCK_TTL_SECONDS);
    if (!acquired) return;

    const stale = await this.reservationsRepo.findStaleConfirmed();

    for (const row of stale) {
      try {
        await this.reservationsService.noShow(row.id);
      } catch (err) {
        this.logger.warn(
          `Failed to mark reservation ${row.id} as no_show: ${err}`,
        );
      }
    }
  }
}
