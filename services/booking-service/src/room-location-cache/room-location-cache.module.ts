import { Module } from "@nestjs/common";
import { RoomLocationCacheRepository } from "./room-location-cache.repository.js";

@Module({
  providers: [RoomLocationCacheRepository],
  exports: [RoomLocationCacheRepository],
})
export class RoomLocationCacheModule {}
