import { Module } from "@nestjs/common";
import { PropertyCheckinKeyController } from "./property-checkin-key.controller.js";
import { PropertyCheckinKeyService } from "./property-checkin-key.service.js";
import { PropertyCheckinKeyRepository } from "./property-checkin-key.repository.js";
import { ClientsModule } from "../clients/clients.module.js";

@Module({
  imports: [ClientsModule],
  controllers: [PropertyCheckinKeyController],
  providers: [PropertyCheckinKeyService, PropertyCheckinKeyRepository],
})
export class PropertyCheckinKeyModule {}
