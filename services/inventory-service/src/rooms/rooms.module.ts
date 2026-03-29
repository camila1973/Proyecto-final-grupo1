import { Module } from "@nestjs/common";
import { RoomsController } from "./rooms.controller";
import { RoomsService } from "./rooms.service";
import { RoomsRepository } from "./rooms.repository";
import { PropertiesModule } from "../properties/properties.module";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [PropertiesModule, EventsModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomsRepository],
  exports: [RoomsService, RoomsRepository],
})
export class RoomsModule {}
