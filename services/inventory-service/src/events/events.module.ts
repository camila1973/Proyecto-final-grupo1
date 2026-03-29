import { Module } from "@nestjs/common";
import { EventsPublisher } from "./events.publisher";

@Module({
  providers: [EventsPublisher],
  exports: [EventsPublisher],
})
export class EventsModule {}
