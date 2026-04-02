import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { InventoryClient } from "./inventory.client";
import { BookingClient } from "./booking.client";

@Module({
  imports: [HttpModule],
  providers: [InventoryClient, BookingClient],
  exports: [InventoryClient, BookingClient],
})
export class ClientsModule {}
