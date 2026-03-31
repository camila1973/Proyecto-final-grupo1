import { Injectable, Logger } from "@nestjs/common";
import { PropertiesRepository } from "../../properties/properties.repository.js";
import {
  PricePeriodsRepository,
  type PricePeriod,
} from "../../properties/price-periods.repository.js";
import { PropertiesService } from "../../properties/properties.service.js";

export type { PricePeriod };

export interface AvailabilityUpdatedPayload {
  room_id: string;
  /** Seasonal price periods to replace for this room. */
  price_periods: PricePeriod[];
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
    await this.pricePeriodsRepo.replaceForRoom(
      payload.room_id,
      payload.price_periods,
    );

    const city = await this.propertiesRepo.findRoomCity(payload.room_id);
    if (city) {
      await this.properties.invalidateCityCache(city);
    }

    this.logger.debug(
      `Updated price periods for room ${payload.room_id} (${payload.price_periods.length} periods)`,
    );
  }
}
