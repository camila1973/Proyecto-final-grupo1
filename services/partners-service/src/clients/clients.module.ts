import { Module } from "@nestjs/common";
import { BookingClientService } from "./booking-client.service.js";
import { PaymentClientService } from "./payment-client.service.js";
import { AuthClientService } from "./auth-client.service.js";
import { InventoryClientService } from "./inventory-client.service.js";

@Module({
  providers: [
    BookingClientService,
    PaymentClientService,
    AuthClientService,
    InventoryClientService,
  ],
  exports: [
    BookingClientService,
    PaymentClientService,
    AuthClientService,
    InventoryClientService,
  ],
})
export class ClientsModule {}
