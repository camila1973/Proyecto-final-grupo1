import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { InventoryClient } from "./inventory.client.js";
import { PartnersClient } from "./partners.client.js";
import { PaymentClient } from "./payment.client.js";

@Module({
  imports: [HttpModule],
  providers: [InventoryClient, PartnersClient, PaymentClient],
  exports: [InventoryClient, PartnersClient, PaymentClient],
})
export class ClientsModule {}
