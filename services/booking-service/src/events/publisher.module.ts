import { Module } from "@nestjs/common";
import { EventsPublisher } from "./events.publisher.js";

@Module({
  providers: [EventsPublisher],
  exports: [EventsPublisher],
})
export class PublisherModule {}
