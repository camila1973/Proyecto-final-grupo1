import { Injectable, Logger } from "@nestjs/common";
import { PartnerFeesCacheRepository } from "../../partner-fees-cache/partner-fees-cache.repository.js";

export interface PartnerFeeDeletedPayload {
  feeId: string;
  partnerId: string;
}

@Injectable()
export class PartnerFeeDeletedHandler {
  private readonly logger = new Logger(PartnerFeeDeletedHandler.name);

  constructor(private readonly cache: PartnerFeesCacheRepository) {}

  async handle(payload: PartnerFeeDeletedPayload): Promise<void> {
    await this.cache.softDelete(payload.feeId);
    this.logger.debug(`Soft-deleted partner_fees_cache entry ${payload.feeId}`);
  }
}
