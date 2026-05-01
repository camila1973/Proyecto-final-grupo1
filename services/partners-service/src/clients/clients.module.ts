import { Module } from "@nestjs/common";
import { BookingClientService } from "./booking-client.service.js";
import { PaymentClientService } from "./payment-client.service.js";
import { AuthClientService } from "./auth-client.service.js";

@Module({
  providers: [BookingClientService, PaymentClientService, AuthClientService],
  exports: [BookingClientService, PaymentClientService, AuthClientService],
})
export class ClientsModule {}
