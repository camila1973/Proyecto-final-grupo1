import { Injectable, Logger } from "@nestjs/common";
import { BookingClientService } from "../../booking/booking-client.service.js";
import { PropertiesRepository } from "../../properties/properties.repository.js";

export interface PartnerFeeUpsertedPayload {
  feeId: string;
  partnerId: string;
  propertyId?: string;
  feeName: string;
  feeType: string;
  rate?: number;
  flatAmount?: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

@Injectable()
export class PartnerFeeUpsertedHandler {
  private readonly logger = new Logger(PartnerFeeUpsertedHandler.name);

  constructor(
    private readonly bookingClient: BookingClientService,
    private readonly repo: PropertiesRepository,
  ) {}

  async handle(payload: PartnerFeeUpsertedPayload): Promise<void> {
    // Re-query booking-service for all active fees for this partner and pre-compute
    // the flat fee totals for the search index
    const allFees = await this.bookingClient.getPartnerFees(payload.partnerId);
    const activeFlatFees = allFees.filter(
      (f) =>
        f.is_active &&
        (f.fee_type === "FLAT_PER_NIGHT" || f.fee_type === "FLAT_PER_STAY"),
    );

    const flatPerNight = activeFlatFees
      .filter((f) => f.fee_type === "FLAT_PER_NIGHT")
      .reduce((acc, f) => acc + parseFloat(f.flat_amount ?? "0"), 0);

    const flatPerStay = activeFlatFees
      .filter((f) => f.fee_type === "FLAT_PER_STAY")
      .reduce((acc, f) => acc + parseFloat(f.flat_amount ?? "0"), 0);

    void this.repo
      .bulkUpdateFlatFees(payload.partnerId, flatPerNight, flatPerStay)
      .catch((err: unknown) => {
        this.logger.error(
          `Failed to bulk-update flat fees for partner ${payload.partnerId}: ${String(err)}`,
        );
      });

    this.logger.debug(
      `Updated room_search_index flat fees for partner ${payload.partnerId} (flatNight=${flatPerNight}, flatStay=${flatPerStay})`,
    );
  }
}
