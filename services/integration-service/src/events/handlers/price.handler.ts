import { Injectable } from "@nestjs/common";
import { IsString, IsNumber, validateOrReject } from "class-validator";
import { plainToInstance } from "class-transformer";
import { ExternalIdService } from "../../external-id/external-id.service";
import { InventoryClient } from "../../clients/inventory.client";
import { FxService } from "../../fx/fx.service";
import { UnknownEntityError } from "../unknown-entity.error";

class PriceEventData {
  @IsString()
  externalRoomId: string;

  @IsString()
  fromDate: string;

  @IsString()
  toDate: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;
}

@Injectable()
export class PriceHandler {
  constructor(
    private readonly externalIdService: ExternalIdService,
    private readonly inventoryClient: InventoryClient,
    private readonly fxService: FxService,
  ) {}

  async handle(partnerId: string, data: unknown): Promise<void> {
    const dto = plainToInstance(PriceEventData, data);
    await validateOrReject(dto);

    const roomId = await this.externalIdService.resolve(
      partnerId,
      "room",
      dto.externalRoomId,
    );
    if (!roomId) throw new UnknownEntityError("room", dto.externalRoomId);

    const priceUsd = await this.fxService.convertToUsd(
      dto.amount,
      dto.currency,
    );

    await this.inventoryClient.updateRates(roomId, {
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      priceUsd,
      currency: dto.currency,
    });
  }
}
