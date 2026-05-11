import { Module } from "@nestjs/common";
import { AppService } from "../app.service.js";
import { EventsService } from "./events.service.js";
import { FirebaseModule } from "../firebase/firebase.module.js";
import { DeviceTokensModule } from "../device-tokens/device-tokens.module.js";

@Module({
  imports: [FirebaseModule, DeviceTokensModule],
  providers: [AppService, EventsService],
  exports: [AppService, EventsService],
})
export class EventsModule {}
