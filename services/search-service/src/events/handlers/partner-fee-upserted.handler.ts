import { Injectable, Logger } from "@nestjs/common";
import { FeesIndexer } from "../../properties/fees-indexer.js";

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

  constructor(private readonly indexer: FeesIndexer) {}

  async handle(payload: PartnerFeeUpsertedPayload): Promise<void> {
    try {
      await this.indexer.refreshPartner(payload.partnerId);
    } catch (err) {
      this.logger.error(
        `Failed to refresh flat fees for partner ${payload.partnerId}: ${String(err)}`,
      );
    }
  }
}
