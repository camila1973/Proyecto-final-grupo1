import { Module } from "@nestjs/common";
import { EventsService } from "./events.service.js";
import { RoomLocationCacheModule } from "../room-location-cache/room-location-cache.module.js";
import { PriceValidationCacheModule } from "../price-validation-cache/price-validation-cache.module.js";

@Module({
  imports: [RoomLocationCacheModule, PriceValidationCacheModule],
  providers: [EventsService],
})
export class EventsModule {}
