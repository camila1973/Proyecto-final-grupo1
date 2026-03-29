import { Module } from "@nestjs/common";
import { RoomRatesController } from "./room-rates.controller";
import { RoomRatesService } from "./room-rates.service";
import { RoomRatesRepository } from "./room-rates.repository";
import { RoomsModule } from "../rooms/rooms.module";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [RoomsModule, EventsModule],
  controllers: [RoomRatesController],
  providers: [RoomRatesService, RoomRatesRepository],
  exports: [RoomRatesService],
})
export class RoomRatesModule {}
