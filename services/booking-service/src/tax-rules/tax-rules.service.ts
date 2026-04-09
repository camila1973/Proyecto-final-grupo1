import { Injectable } from "@nestjs/common";
import { TaxRulesRepository } from "./tax-rules.repository.js";
import { EventsPublisher } from "../events/events.publisher.js";
import { CreateTaxRuleDto } from "./dto/create-tax-rule.dto.js";
import { UpdateTaxRuleDto } from "./dto/update-tax-rule.dto.js";
import type { TaxRuleRow } from "../database/database.types.js";

@Injectable()
export class TaxRulesService {
  constructor(
    private readonly repo: TaxRulesRepository,
    private readonly publisher: EventsPublisher,
  ) {}

  async create(dto: CreateTaxRuleDto): Promise<TaxRuleRow> {
    const row = await this.repo.insert({
      country: dto.country,
      city: dto.city ?? null,
      tax_name: dto.taxName,
      tax_type: dto.taxType,
      rate: dto.rate ?? null,
      flat_amount: dto.flatAmount ?? null,
      currency: dto.currency ?? "USD",
      effective_from: dto.effectiveFrom,
      effective_to: dto.effectiveTo ?? null,
    });
    this.publisher.publish("tax.rule.upserted", this.toUpsertedEvent(row));
    return row;
  }

  async findAll(country?: string): Promise<TaxRuleRow[]> {
    return this.repo.findAll(country);
  }

  async findOne(id: string): Promise<TaxRuleRow> {
    return this.repo.findById(id);
  }

  async update(id: string, dto: UpdateTaxRuleDto): Promise<TaxRuleRow> {
    const row = await this.repo.update(id, {
      ...(dto.country !== undefined && { country: dto.country }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.taxName !== undefined && { tax_name: dto.taxName }),
      ...(dto.taxType !== undefined && { tax_type: dto.taxType }),
      ...(dto.rate !== undefined && { rate: dto.rate }),
      ...(dto.flatAmount !== undefined && { flat_amount: dto.flatAmount }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.effectiveFrom !== undefined && {
        effective_from: dto.effectiveFrom,
      }),
      ...(dto.effectiveTo !== undefined && { effective_to: dto.effectiveTo }),
    });
    this.publisher.publish("tax.rule.upserted", this.toUpsertedEvent(row));
    return row;
  }

  async remove(id: string): Promise<void> {
    const row = await this.repo.findById(id);
    await this.repo.softDelete(id);
    this.publisher.publish("tax.rule.deleted", {
      routingKey: "tax.rule.deleted",
      ruleId: row.id,
      country: row.country,
      city: row.city ?? undefined,
      timestamp: new Date().toISOString(),
    });
  }

  private toUpsertedEvent(row: TaxRuleRow) {
    return {
      routingKey: "tax.rule.upserted",
      ruleId: row.id,
      country: row.country,
      city: row.city ?? undefined,
      taxName: row.tax_name,
      taxType: row.tax_type,
      rate: row.rate != null ? parseFloat(row.rate) : undefined,
      flatAmount:
        row.flat_amount != null ? parseFloat(row.flat_amount) : undefined,
      currency: row.currency,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to ?? undefined,
      timestamp: new Date().toISOString(),
    };
  }
}
