import { Injectable, Logger } from "@nestjs/common";
import {
  PropertiesRepository,
  type RoomIndexRecord,
} from "../../properties/properties.repository.js";
import { PropertiesService } from "../../properties/properties.service.js";

export type RoomUpsertedPayload = RoomIndexRecord;

@Injectable()
export class RoomUpsertedHandler {
  private readonly logger = new Logger(RoomUpsertedHandler.name);

  constructor(
    private readonly repo: PropertiesRepository,
    private readonly properties: PropertiesService,
  ) {}

  async handle(payload: RoomUpsertedPayload): Promise<void> {
    await this.repo.upsertRoom(payload);
    await this.properties.invalidateCityCache(payload.city);
    this.logger.debug(
      `Upserted room ${payload.room_id} for city ${payload.city}`,
    );
  }
}
