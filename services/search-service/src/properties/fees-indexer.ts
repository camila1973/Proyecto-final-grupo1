import { Injectable, Logger } from "@nestjs/common";
import {
  BookingClientService,
  type PartnerFeeDto,
} from "../booking/booking-client.service.js";
import { PropertiesRepository } from "./properties.repository.js";

export interface FlatFeeTotals {
  perNight: number;
  perStay: number;
}

// Sum applicable flat fees for a single property: partner-wide rows
// (property_id = null) plus rows scoped to that property.
export function aggregateFlatFees(
  fees: PartnerFeeDto[],
  propertyId: string,
): FlatFeeTotals {
  const applicable = fees.filter(
    (f) =>
      f.is_active &&
      (f.fee_type === "FLAT_PER_NIGHT" || f.fee_type === "FLAT_PER_STAY") &&
      // Treat null/undefined property_id as partner-wide.
      (f.property_id == null || f.property_id === propertyId),
  );
  const sum = (type: string) =>
    applicable
      .filter((f) => f.fee_type === type)
      .reduce((acc, f) => acc + parseFloat(f.flat_amount ?? "0"), 0);
  return { perNight: sum("FLAT_PER_NIGHT"), perStay: sum("FLAT_PER_STAY") };
}

@Injectable()
export class FeesIndexer {
  private readonly logger = new Logger(FeesIndexer.name);

  constructor(
    private readonly bookingClient: BookingClientService,
    private readonly repo: PropertiesRepository,
  ) {}

  async refreshPartner(partnerId: string): Promise<void> {
    const fees = await this.bookingClient.getPartnerFees(partnerId);
    const propertyIds = await this.repo.findPropertyIdsForPartner(partnerId);
    for (const propertyId of propertyIds) {
      const { perNight, perStay } = aggregateFlatFees(fees, propertyId);
      await this.repo.updateFlatFeesForProperty(
        partnerId,
        propertyId,
        perNight,
        perStay,
      );
    }
    this.logger.debug(
      `Refreshed flat fees for partner ${partnerId} across ${propertyIds.length} properties`,
    );
  }
}
