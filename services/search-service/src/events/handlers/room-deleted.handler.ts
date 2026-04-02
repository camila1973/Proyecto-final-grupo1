import { Injectable, Logger } from "@nestjs/common";
import { PropertiesRepository } from "../../properties/properties.repository.js";
import { PropertiesService } from "../../properties/properties.service.js";

export interface RoomDeletedPayload {
  routingKey: "inventory.room.deleted";
  roomId: string;
  propertyId: string;
  timestamp: string;
}

@Injectable()
export class RoomDeletedHandler {
  private readonly logger = new Logger(RoomDeletedHandler.name);

  constructor(
    private readonly repo: PropertiesRepository,
    private readonly properties: PropertiesService,
  ) {}

  async handle(payload: RoomDeletedPayload): Promise<void> {
    const city = await this.repo.findRoomCity(payload.roomId);
    await this.repo.deactivateRoom(payload.roomId);
    if (city) {
      await this.properties.invalidateCityCache(city);
    }
    this.logger.debug(
      `Deactivated room ${payload.roomId} for property ${payload.propertyId}`,
    );
  }
}
