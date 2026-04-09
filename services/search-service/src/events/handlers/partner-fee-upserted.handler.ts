import { Injectable, Logger } from "@nestjs/common";
import { PartnerFeesCacheRepository } from "../../partner-fees-cache/partner-fees-cache.repository.js";

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

  constructor(private readonly cache: PartnerFeesCacheRepository) {}

  async handle(payload: PartnerFeeUpsertedPayload): Promise<void> {
    await this.cache.upsert({
      id: payload.feeId,
      partnerId: payload.partnerId,
      propertyId: payload.propertyId,
      feeName: payload.feeName,
      feeType: payload.feeType,
      rate: payload.rate,
      flatAmount: payload.flatAmount,
      currency: payload.currency,
      effectiveFrom: payload.effectiveFrom,
      effectiveTo: payload.effectiveTo,
    });
    this.logger.debug(
      `Upserted partner_fees_cache entry ${payload.feeId} for partner ${payload.partnerId}`,
    );
  }
}
