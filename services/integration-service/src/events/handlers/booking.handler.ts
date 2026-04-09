import { Injectable } from "@nestjs/common";
import { IsString, IsNumber, validateOrReject } from "class-validator";
import { plainToInstance } from "class-transformer";
import { ExternalIdService } from "../../external-id/external-id.service";
import { BookingClient } from "../../clients/booking.client";
import { UnknownEntityError } from "../unknown-entity.error";

class BookingEventData {
  @IsString()
  externalId: string;

  @IsString()
  externalPropertyId: string;

  @IsString()
  externalRoomId: string;

  @IsString()
  guestName: string;

  @IsString()
  checkIn: string;

  @IsString()
  checkOut: string;

  @IsNumber()
  totalPriceUsd: number;
}

@Injectable()
export class BookingHandler {
  constructor(
    private readonly externalIdService: ExternalIdService,
    private readonly bookingClient: BookingClient,
  ) {}

  async handle(partnerId: string, data: unknown): Promise<void> {
    const dto = plainToInstance(BookingEventData, data);
    await validateOrReject(dto);

    const existingId = await this.externalIdService.resolve(
      partnerId,
      "booking",
      dto.externalId,
    );
    if (existingId) return;

    const propertyId = await this.externalIdService.resolve(
      partnerId,
      "property",
      dto.externalPropertyId,
    );
    if (!propertyId)
      throw new UnknownEntityError("property", dto.externalPropertyId);

    const roomId = await this.externalIdService.resolve(
      partnerId,
      "room",
      dto.externalRoomId,
    );
    if (!roomId) throw new UnknownEntityError("room", dto.externalRoomId);

    const result = await this.bookingClient.createBooking({
      propertyId,
      roomId,
      partnerId,
      guestName: dto.guestName,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      totalPriceUsd: dto.totalPriceUsd,
      externalBookingId: dto.externalId,
    });

    await this.externalIdService.register(
      partnerId,
      "booking",
      dto.externalId,
      result.id,
    );
  }
}
