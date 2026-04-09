import { Module } from "@nestjs/common";
import { FeesController } from "./fees.controller.js";
import { FeesService } from "./fees.service.js";
import { ClientsModule } from "../clients/clients.module.js";

@Module({
  imports: [ClientsModule],
  controllers: [FeesController],
  providers: [FeesService],
})
export class FeesModule {}
