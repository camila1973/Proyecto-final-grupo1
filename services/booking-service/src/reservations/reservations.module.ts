import { Module } from "@nestjs/common";
import { ReservationsController } from "./reservations.controller.js";
import { ReservationsService } from "./reservations.service.js";
import { ReservationsRepository } from "./reservations.repository.js";
import { HoldExpiryService } from "./hold-expiry.service.js";
import { FareCalculatorService } from "../fare/fare-calculator.service.js";
import { ClientsModule } from "../clients/clients.module.js";
import { CacheModule } from "../cache/cache.module.js";
import { TaxRulesModule } from "../tax-rules/tax-rules.module.js";
import { PartnerFeesModule } from "../partner-fees/partner-fees.module.js";
import { PublisherModule } from "../events/publisher.module.js";

@Module({
  imports: [
    ClientsModule,
    CacheModule,
    TaxRulesModule,
    PartnerFeesModule,
    PublisherModule,
  ],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationsRepository,
    HoldExpiryService,
    FareCalculatorService,
  ],
})
export class ReservationsModule {}
