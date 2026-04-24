import { Injectable } from "@nestjs/common";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  validateOrReject,
} from "class-validator";
import { plainToInstance, Type, Transform } from "class-transformer";
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
  @Type(() => Number)
  @IsNumber()
  stars?: number;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lon?: number;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string"
      ? value
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
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
        neighborhood: dto.neighborhood,
        lat: dto.lat,
        lon: dto.lon,
        thumbnailUrl: dto.thumbnailUrl,
        amenities: dto.amenities,
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
        neighborhood: dto.neighborhood,
        lat: dto.lat,
        lon: dto.lon,
        thumbnailUrl: dto.thumbnailUrl,
        amenities: dto.amenities,
      });
    }
  }
}
