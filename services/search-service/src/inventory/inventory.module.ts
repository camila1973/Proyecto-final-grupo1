import { Module } from "@nestjs/common";
import { InventoryClientService } from "./inventory-client.service.js";

@Module({
  providers: [InventoryClientService],
  exports: [InventoryClientService],
})
export class InventoryModule {}
