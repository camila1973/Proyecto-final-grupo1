import { Module } from "@nestjs/common";
import { ReservationsController } from "./reservations.controller.js";
import { ReservationsService } from "./reservations.service.js";
import { ReservationsRepository } from "./reservations.repository.js";
import { FareCalculatorService } from "../fare/fare-calculator.service.js";
import { ClientsModule } from "../clients/clients.module.js";
import { TaxRulesModule } from "../tax-rules/tax-rules.module.js";
import { PartnerFeesModule } from "../partner-fees/partner-fees.module.js";
import { PublisherModule } from "../events/publisher.module.js";

@Module({
  imports: [ClientsModule, TaxRulesModule, PartnerFeesModule, PublisherModule],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationsRepository,
    FareCalculatorService,
  ],
})
export class ReservationsModule {}
