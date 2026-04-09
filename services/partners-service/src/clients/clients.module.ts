import { Module } from "@nestjs/common";
import { BookingClientService } from "./booking-client.service.js";

@Module({
  providers: [BookingClientService],
  exports: [BookingClientService],
})
export class ClientsModule {}
