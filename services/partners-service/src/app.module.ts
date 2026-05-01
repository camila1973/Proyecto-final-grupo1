import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { DatabaseModule } from "./database/database.module.js";
import { PartnersModule } from "./partners/partners.module.js";
import { FeesModule } from "./fees/fees.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { PropertyCheckinKeyModule } from "./property-checkin-key/property-checkin-key.module.js";
import { MembersModule } from "./members/members.module.js";

@Module({
  imports: [
    DatabaseModule,
    PartnersModule,
    FeesModule,
    DashboardModule,
    PropertyCheckinKeyModule,
    MembersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
