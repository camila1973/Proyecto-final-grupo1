import { Module } from "@nestjs/common";
import { ReservationsController } from "./reservations.controller.js";
import { ReservationsService } from "./reservations.service.js";
import { ReservationsRepository } from "./reservations.repository.js";
import { FareCalculatorService } from "../fare/fare-calculator.service.js";
import { TaxRulesRepository } from "../tax-rules/tax-rules.repository.js";
import { PartnerFeesRepository } from "../partner-fees/partner-fees.repository.js";
import { RoomLocationCacheModule } from "../room-location-cache/room-location-cache.module.js";
import { PriceValidationCacheModule } from "../price-validation-cache/price-validation-cache.module.js";

@Module({
  imports: [RoomLocationCacheModule, PriceValidationCacheModule],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationsRepository,
    FareCalculatorService,
    TaxRulesRepository,
    PartnerFeesRepository,
  ],
})
export class ReservationsModule {}
