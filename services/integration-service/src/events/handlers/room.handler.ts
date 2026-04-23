import { Injectable } from "@nestjs/common";
import {
  IsString,
  IsNumber,
  IsOptional,
  validateOrReject,
} from "class-validator";
import { plainToInstance, Type } from "class-transformer";
import { ExternalIdService } from "../../external-id/external-id.service";
import { InventoryClient } from "../../clients/inventory.client";
import { UnknownEntityError } from "../unknown-entity.error";

class RoomEventData {
  @IsString()
  externalId!: string;

  @IsString()
  externalPropertyId!: string;

  @IsString()
  roomType!: string;

  @Type(() => Number)
  @IsNumber()
  capacity!: number;

  @Type(() => Number)
  @IsNumber()
  totalRooms!: number;

  @Type(() => Number)
  @IsNumber()
  basePriceUsd!: number;

  @IsOptional()
  @IsString()
  bedType?: string;

  @IsOptional()
  @IsString()
  viewType?: string;
}

@Injectable()
export class RoomHandler {
  constructor(
    private readonly externalIdService: ExternalIdService,
    private readonly inventoryClient: InventoryClient,
  ) {}

  async handle(
    partnerId: string,
    eventType: string,
    data: unknown,
  ): Promise<void> {
    const dto = plainToInstance(RoomEventData, data);
    await validateOrReject(dto);

    const internalId = await this.externalIdService.resolve(
      partnerId,
      "room",
      dto.externalId,
    );

    if (eventType === "room.created") {
      if (internalId) return;
      const propertyId = await this.externalIdService.resolve(
        partnerId,
        "property",
        dto.externalPropertyId,
      );
      if (!propertyId)
        throw new UnknownEntityError("property", dto.externalPropertyId);

      const result = await this.inventoryClient.createRoom(propertyId, {
        roomType: dto.roomType,
        capacity: dto.capacity,
        totalRooms: dto.totalRooms,
        basePriceUsd: dto.basePriceUsd,
        bedType: dto.bedType,
        viewType: dto.viewType,
      });
      await this.externalIdService.register(
        partnerId,
        "room",
        dto.externalId,
        result.id,
      );
    } else {
      if (!internalId) throw new UnknownEntityError("room", dto.externalId);
      await this.inventoryClient.updateRoom(internalId, {
        roomType: dto.roomType,
        capacity: dto.capacity,
        totalRooms: dto.totalRooms,
        basePriceUsd: dto.basePriceUsd,
      });
    }
  }
}
