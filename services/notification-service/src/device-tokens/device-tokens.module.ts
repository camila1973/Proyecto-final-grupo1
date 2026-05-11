import { Module } from "@nestjs/common";
import { DeviceTokensController } from "./device-tokens.controller.js";
import { DeviceTokensService } from "./device-tokens.service.js";

@Module({
  controllers: [DeviceTokensController],
  providers: [DeviceTokensService],
  exports: [DeviceTokensService],
})
export class DeviceTokensModule {}
