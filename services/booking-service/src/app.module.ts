import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { DatabaseModule } from "./database/database.module.js";
import { CacheModule } from "./cache/cache.module.js";
import { EventsModule } from "./events/events.module.js";
import { ReservationsModule } from "./reservations/reservations.module.js";
import { TaxRulesModule } from "./tax-rules/tax-rules.module.js";
import { PartnerFeesModule } from "./partner-fees/partner-fees.module.js";
import { PublisherModule } from "./events/publisher.module.js";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    CacheModule,
    EventsModule,
    ReservationsModule,
    TaxRulesModule,
    PartnerFeesModule,
    PublisherModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
