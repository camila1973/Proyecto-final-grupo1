import { Injectable } from "@nestjs/common";
import { IsString, IsBoolean, validateOrReject } from "class-validator";
import { plainToInstance } from "class-transformer";
import { ExternalIdService } from "../../external-id/external-id.service";
import { InventoryClient } from "../../clients/inventory.client";
import { UnknownEntityError } from "../unknown-entity.error";

class AvailabilityEventData {
  @IsString()
  externalRoomId: string;

  @IsString()
  date: string;

  @IsBoolean()
  available: boolean;
}

@Injectable()
export class AvailabilityHandler {
  constructor(
    private readonly externalIdService: ExternalIdService,
    private readonly inventoryClient: InventoryClient,
  ) {}

  async handle(partnerId: string, data: unknown): Promise<void> {
    const dto = plainToInstance(AvailabilityEventData, data);
    await validateOrReject(dto);

    const roomId = await this.externalIdService.resolve(
      partnerId,
      "room",
      dto.externalRoomId,
    );
    if (!roomId) throw new UnknownEntityError("room", dto.externalRoomId);

    await this.inventoryClient.updateAvailability(roomId, {
      date: dto.date,
      available: dto.available,
    });
  }
}
