import { Injectable, Logger } from "@nestjs/common";
import { FeesIndexer } from "../../properties/fees-indexer.js";

export interface PartnerFeeDeletedPayload {
  feeId: string;
  partnerId: string;
}

@Injectable()
export class PartnerFeeDeletedHandler {
  private readonly logger = new Logger(PartnerFeeDeletedHandler.name);

  constructor(private readonly indexer: FeesIndexer) {}

  async handle(payload: PartnerFeeDeletedPayload): Promise<void> {
    try {
      await this.indexer.refreshPartner(payload.partnerId);
    } catch (err) {
      this.logger.error(
        `Failed to refresh flat fees for partner ${payload.partnerId} after fee deletion: ${String(err)}`,
      );
    }
  }
}
