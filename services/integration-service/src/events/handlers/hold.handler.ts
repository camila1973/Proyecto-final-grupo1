import { Injectable } from "@nestjs/common";
import { IsString, validateOrReject } from "class-validator";
import { plainToInstance } from "class-transformer";
import { ExternalIdService } from "../../external-id/external-id.service";
import { BookingClient } from "../../clients/booking.client";
import { UnknownEntityError } from "../unknown-entity.error";

class HoldEventData {
  @IsString()
  externalId: string;

  @IsString()
  externalRoomId: string;

  @IsString()
  checkIn: string;

  @IsString()
  checkOut: string;
}

@Injectable()
export class HoldHandler {
  constructor(
    private readonly externalIdService: ExternalIdService,
    private readonly bookingClient: BookingClient,
  ) {}

  async handle(
    partnerId: string,
    eventType: string,
    data: unknown,
  ): Promise<void> {
    const dto = plainToInstance(HoldEventData, data);
    await validateOrReject(dto);

    if (eventType === "hold.created") {
      const existingId = await this.externalIdService.resolve(
        partnerId,
        "hold",
        dto.externalId,
      );
      if (existingId) return;

      const roomId = await this.externalIdService.resolve(
        partnerId,
        "room",
        dto.externalRoomId,
      );
      if (!roomId) throw new UnknownEntityError("room", dto.externalRoomId);

      const result = await this.bookingClient.createHold({
        roomId,
        partnerId,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        externalHoldId: dto.externalId,
      });

      await this.externalIdService.register(
        partnerId,
        "hold",
        dto.externalId,
        result.id,
      );
    } else {
      // hold.released
      const holdId = await this.externalIdService.resolve(
        partnerId,
        "hold",
        dto.externalId,
      );
      if (!holdId) throw new UnknownEntityError("hold", dto.externalId);
      await this.bookingClient.releaseHold(holdId);
    }
  }
}
