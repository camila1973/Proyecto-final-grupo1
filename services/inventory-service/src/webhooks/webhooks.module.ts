import { Module } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";
import { PropertiesModule } from "../properties/properties.module";
import { RoomsModule } from "../rooms/rooms.module";
import { RoomRatesModule } from "../room-rates/room-rates.module";
import { AvailabilityModule } from "../availability/availability.module";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [
    PropertiesModule,
    RoomsModule,
    RoomRatesModule,
    AvailabilityModule,
    EventsModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
