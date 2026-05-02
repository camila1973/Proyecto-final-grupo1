import { Module } from "@nestjs/common";
import { ClientsModule } from "../clients/clients.module.js";
import { PropertyController } from "./property.controller.js";
import { PropertyService } from "./property.service.js";

@Module({
  imports: [ClientsModule],
  controllers: [PropertyController],
  providers: [PropertyService],
})
export class PropertyModule {}
