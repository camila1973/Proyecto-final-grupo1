import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { EventsModule } from "./events/events.module";
import { PropertiesModule } from "./properties/properties.module";
import { RoomsModule } from "./rooms/rooms.module";
import { RoomRatesModule } from "./room-rates/room-rates.module";
import { AvailabilityModule } from "./availability/availability.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
    PropertiesModule,
    RoomsModule,
    RoomRatesModule,
    AvailabilityModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
