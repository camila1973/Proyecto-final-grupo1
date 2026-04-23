import { Module } from "@nestjs/common";
import { HoldsController } from "./holds.controller.js";
import { HoldsService } from "./holds.service.js";
import { ClientsModule } from "../clients/clients.module.js";
import { CacheModule } from "../cache/cache.module.js";

@Module({
  imports: [ClientsModule, CacheModule],
  controllers: [HoldsController],
  providers: [HoldsService],
})
export class HoldsModule {}
