import { Module } from "@nestjs/common";
import { AppService } from "../app.service.js";
import { EventsService } from "./events.service.js";

@Module({
  providers: [AppService, EventsService],
  exports: [AppService, EventsService],
})
export class EventsModule {}
