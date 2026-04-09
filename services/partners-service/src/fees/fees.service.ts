import { Injectable } from "@nestjs/common";
import { BookingClientService } from "../clients/booking-client.service.js";
import { CreateFeeDto } from "./dto/create-fee.dto.js";
import { UpdateFeeDto } from "./dto/update-fee.dto.js";

@Injectable()
export class FeesService {
  constructor(private readonly bookingClient: BookingClientService) {}

  async create(dto: CreateFeeDto): Promise<Record<string, unknown>> {
    return this.bookingClient.upsertFee({
      partnerId: dto.partnerId,
      propertyId: dto.propertyId,
      feeName: dto.feeName,
      feeType: dto.feeType,
      rate: dto.rate,
      flatAmount: dto.flatAmount,
      currency: dto.currency,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo,
    });
  }

  async findAll(partnerId: string): Promise<Record<string, unknown>[]> {
    return this.bookingClient.listFees(partnerId);
  }

  async update(
    id: string,
    partnerId: string,
    dto: UpdateFeeDto,
  ): Promise<Record<string, unknown>> {
    return this.bookingClient.upsertFee({
      id,
      partnerId,
      propertyId: dto.propertyId,
      feeName: dto.feeName ?? "",
      feeType: dto.feeType ?? "FLAT_PER_NIGHT",
      rate: dto.rate,
      flatAmount: dto.flatAmount,
      currency: dto.currency,
      effectiveFrom: dto.effectiveFrom ?? new Date().toISOString().slice(0, 10),
      effectiveTo: dto.effectiveTo,
    });
  }

  async remove(id: string): Promise<void> {
    await this.bookingClient.deleteFee(id);
  }
}
