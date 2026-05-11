import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { EventsModule } from "./events/events.module.js";
import { FirebaseModule } from "./firebase/firebase.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { DeviceTokensModule } from "./device-tokens/device-tokens.module.js";

@Module({
  imports: [DatabaseModule, FirebaseModule, DeviceTokensModule, EventsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
