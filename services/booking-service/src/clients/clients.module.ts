import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { InventoryClient } from "./inventory.client.js";

@Module({
  imports: [HttpModule],
  providers: [InventoryClient],
  exports: [InventoryClient],
})
export class ClientsModule {}
