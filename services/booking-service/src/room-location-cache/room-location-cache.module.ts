import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { RoomLocationCacheService } from "./room-location-cache.service.js";
import { InventoryClient } from "./inventory.client.js";

@Module({
  imports: [HttpModule],
  providers: [RoomLocationCacheService, InventoryClient],
  exports: [RoomLocationCacheService],
})
export class RoomLocationCacheModule {}
