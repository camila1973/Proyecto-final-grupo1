import { Module } from "@nestjs/common";
import {
  HotelbedsAdapterService,
  HotelbedsController,
} from "./hotelbeds/hotelbeds.adapter";
import {
  TravelClickAdapterService,
  TravelClickController,
} from "./travelclick/travelclick.adapter";
import {
  RoomRaccoonAdapterService,
  RoomRaccoonController,
} from "./roomraccoon/roomraccoon.adapter";
import { ExternalIdModule } from "../../external-id/external-id.module";
import { EventsModule } from "../../events/events.module";

@Module({
  imports: [ExternalIdModule, EventsModule],
  providers: [
    HotelbedsAdapterService,
    TravelClickAdapterService,
    RoomRaccoonAdapterService,
  ],
  controllers: [
    HotelbedsController,
    TravelClickController,
    RoomRaccoonController,
  ],
})
export class VendorsModule {}
