import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { InventoryClient } from "./inventory.client.js";
import { NotificationClient } from "./notification.client.js";

@Module({
  imports: [HttpModule],
  providers: [InventoryClient, NotificationClient],
  exports: [InventoryClient, NotificationClient],
})
export class ClientsModule {}
