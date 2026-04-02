import { Module } from "@nestjs/common";
import { PropertyHandler } from "./handlers/property.handler";
import { RoomHandler } from "./handlers/room.handler";
import { AvailabilityHandler } from "./handlers/availability.handler";
import { PriceHandler } from "./handlers/price.handler";
import { BookingHandler } from "./handlers/booking.handler";
import { HoldHandler } from "./handlers/hold.handler";
import { ExternalIdModule } from "../external-id/external-id.module";
import { ClientsModule } from "../clients/clients.module";
import { FxModule } from "../fx/fx.module";

@Module({
  imports: [ExternalIdModule, ClientsModule, FxModule],
  providers: [
    PropertyHandler,
    RoomHandler,
    AvailabilityHandler,
    PriceHandler,
    BookingHandler,
    HoldHandler,
  ],
  exports: [
    PropertyHandler,
    RoomHandler,
    AvailabilityHandler,
    PriceHandler,
    BookingHandler,
    HoldHandler,
  ],
})
export class EventsModule {}
