import { Injectable, Logger } from "@nestjs/common";
import { PropertiesRepository } from "../../properties/properties.repository.js";
import {
  PricePeriodsRepository,
  type PricePeriod,
} from "../../properties/price-periods.repository.js";
import { PropertiesService } from "../../properties/properties.service.js";

export type { PricePeriod };

export interface AvailabilityUpdatedPayload {
  roomId: string;
  pricePeriods: Array<{ fromDate: string; toDate: string; priceUsd: number }>;
}

@Injectable()
export class AvailabilityUpdatedHandler {
  private readonly logger = new Logger(AvailabilityUpdatedHandler.name);

  constructor(
    private readonly propertiesRepo: PropertiesRepository,
    private readonly pricePeriodsRepo: PricePeriodsRepository,
    private readonly properties: PropertiesService,
  ) {}

  async handle(payload: AvailabilityUpdatedPayload): Promise<void> {
    const periods: PricePeriod[] = payload.pricePeriods.map((p) => ({
      from_date: p.fromDate,
      to_date: p.toDate,
      price_usd: p.priceUsd,
    }));

    await this.pricePeriodsRepo.replaceForRoom(payload.roomId, periods);

    const city = await this.propertiesRepo.findRoomCity(payload.roomId);
    if (city) {
      await this.properties.invalidateCityCache(city);
    }

    this.logger.debug(
      `Updated price periods for room ${payload.roomId} (${periods.length} periods)`,
    );
  }
}
