import { Module } from "@nestjs/common";
import { ReservationsController } from "./reservations.controller.js";
import { ReservationsService } from "./reservations.service.js";
import { ReservationsRepository } from "./reservations.repository.js";
import { FareCalculatorService } from "../fare/fare-calculator.service.js";
import { RoomLocationCacheModule } from "../room-location-cache/room-location-cache.module.js";
import { PriceValidationCacheModule } from "../price-validation-cache/price-validation-cache.module.js";
import { TaxRulesModule } from "../tax-rules/tax-rules.module.js";
import { PartnerFeesModule } from "../partner-fees/partner-fees.module.js";
import { PublisherModule } from "../events/publisher.module.js";

@Module({
  imports: [
    RoomLocationCacheModule,
    PriceValidationCacheModule,
    TaxRulesModule,
    PartnerFeesModule,
    PublisherModule,
  ],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationsRepository,
    FareCalculatorService,
  ],
})
export class ReservationsModule {}
