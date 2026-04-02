import { Injectable } from "@nestjs/common";
import {
  IsString,
  IsOptional,
  IsNumber,
  validateOrReject,
} from "class-validator";
import { plainToInstance } from "class-transformer";
import { ExternalIdService } from "../../external-id/external-id.service";
import { InventoryClient } from "../../clients/inventory.client";
import { UnknownEntityError } from "../unknown-entity.error";

class PropertyEventData {
  @IsString()
  externalId: string;

  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsString()
  city: string;

  @IsString()
  countryCode: string;

  @IsOptional()
  @IsNumber()
  stars?: number;
}

@Injectable()
export class PropertyHandler {
  constructor(
    private readonly externalIdService: ExternalIdService,
    private readonly inventoryClient: InventoryClient,
  ) {}

  async handle(
    partnerId: string,
    eventType: string,
    data: unknown,
  ): Promise<void> {
    const dto = plainToInstance(PropertyEventData, data);
    await validateOrReject(dto);

    const internalId = await this.externalIdService.resolve(
      partnerId,
      "property",
      dto.externalId,
    );

    if (eventType === "property.created") {
      if (internalId) return; // already exists
      const result = await this.inventoryClient.createProperty({
        name: dto.name,
        type: dto.type,
        city: dto.city,
        countryCode: dto.countryCode,
        partnerId,
        stars: dto.stars,
      });
      await this.externalIdService.register(
        partnerId,
        "property",
        dto.externalId,
        result.id,
      );
    } else {
      if (!internalId) throw new UnknownEntityError("property", dto.externalId);
      await this.inventoryClient.updateProperty(internalId, {
        name: dto.name,
        type: dto.type,
        city: dto.city,
        stars: dto.stars,
      });
    }
  }
}
