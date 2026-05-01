import { Module } from "@nestjs/common";
import { PropertyCheckinKeyController } from "./property-checkin-key.controller.js";
import { PropertyCheckinKeyService } from "./property-checkin-key.service.js";
import { PropertyCheckinKeyRepository } from "./property-checkin-key.repository.js";

@Module({
  controllers: [PropertyCheckinKeyController],
  providers: [PropertyCheckinKeyService, PropertyCheckinKeyRepository],
})
export class PropertyCheckinKeyModule {}
