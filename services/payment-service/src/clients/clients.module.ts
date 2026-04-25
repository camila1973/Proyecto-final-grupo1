import { Module } from "@nestjs/common";
import { BookingClient } from "./booking.client.js";
import { NotificationClient } from "./notification.client.js";

@Module({
  providers: [BookingClient, NotificationClient],
  exports: [BookingClient, NotificationClient],
})
export class ClientsModule {}
