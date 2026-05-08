import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { EventsModule } from "./events/events.module.js";

@Module({
  imports: [EventsModule],
  controllers: [AppController],
})
export class AppModule {}
