import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { InventoryClient } from "./inventory.client.js";
import { PartnersClient } from "./partners.client.js";

@Module({
  imports: [HttpModule],
  providers: [InventoryClient, PartnersClient],
  exports: [InventoryClient, PartnersClient],
})
export class ClientsModule {}
