import { Module } from "@nestjs/common";
import { BookingClientService } from "./booking-client.service.js";
import { PaymentClientService } from "./payment-client.service.js";

@Module({
  providers: [BookingClientService, PaymentClientService],
  exports: [BookingClientService, PaymentClientService],
})
export class ClientsModule {}
