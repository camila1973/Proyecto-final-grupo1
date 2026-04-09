import { Injectable } from "@nestjs/common";
import { PartnerFeesRepository } from "./partner-fees.repository.js";
import { EventsPublisher } from "../events/events.publisher.js";
import type {
  PartnerFeeRow,
  NewPartnerFee,
} from "../database/database.types.js";

@Injectable()
export class PartnerFeesService {
  constructor(
    private readonly repo: PartnerFeesRepository,
    private readonly publisher: EventsPublisher,
  ) {}

  async upsert(data: NewPartnerFee & { id?: string }): Promise<PartnerFeeRow> {
    const row = await this.repo.upsert(data);
    this.publisher.publish("partner.fee.upserted", {
      routingKey: "partner.fee.upserted",
      feeId: row.id,
      partnerId: row.partner_id,
      propertyId: row.property_id ?? undefined,
      feeName: row.fee_name,
      feeType: row.fee_type,
      rate: row.rate != null ? parseFloat(String(row.rate)) : undefined,
      flatAmount:
        row.flat_amount != null
          ? parseFloat(String(row.flat_amount))
          : undefined,
      currency: row.currency,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to ?? undefined,
      timestamp: new Date().toISOString(),
    });
    return row;
  }

  async findAll(partnerId: string): Promise<PartnerFeeRow[]> {
    return this.repo.findAll(partnerId);
  }

  async softDelete(id: string): Promise<void> {
    const row = await this.repo.findById(id);
    await this.repo.softDelete(id);
    if (row) {
      this.publisher.publish("partner.fee.deleted", {
        routingKey: "partner.fee.deleted",
        feeId: id,
        partnerId: row.partner_id,
        propertyId: row.property_id ?? undefined,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
