import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { PartnerFeesService } from "../partner-fees.service.js";

class UpsertFeeDto {
  id?: string;
  partnerId!: string;
  propertyId?: string;
  feeName!: string;
  feeType!: "PERCENTAGE" | "FLAT_PER_NIGHT" | "FLAT_PER_STAY";
  rate?: number;
  flatAmount?: number;
  currency?: string;
  effectiveFrom!: string;
  effectiveTo?: string;
}

@Controller("internal/fees")
export class InternalFeesController {
  constructor(private readonly service: PartnerFeesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  upsert(@Body() dto: UpsertFeeDto) {
    return this.service.upsert({
      id: dto.id,
      partner_id: dto.partnerId,
      property_id: dto.propertyId ?? null,
      fee_name: dto.feeName,
      fee_type: dto.feeType,
      rate: dto.rate ?? null,
      flat_amount: dto.flatAmount ?? null,
      currency: dto.currency ?? "USD",
      effective_from: dto.effectiveFrom,
      effective_to: dto.effectiveTo ?? null,
    });
  }

  @Get()
  findAll(@Query("partnerId") partnerId: string) {
    return this.service.findAll(partnerId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.service.softDelete(id);
  }
}
