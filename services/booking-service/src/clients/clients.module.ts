import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { InventoryClient } from "./inventory.client.js";
import { NotificationClient } from "./notification.client.js";
import { PartnersClient } from "./partners.client.js";

@Module({
  imports: [HttpModule],
  providers: [InventoryClient, NotificationClient, PartnersClient],
  exports: [InventoryClient, NotificationClient, PartnersClient],
})
export class ClientsModule {}
