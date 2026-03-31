import { Module } from "@nestjs/common";
import { PropertiesController } from "./properties.controller.js";
import { PropertiesService } from "./properties.service.js";
import { PropertiesRepository } from "./properties.repository.js";
import { PricePeriodsRepository } from "./price-periods.repository.js";
import { FacetsService } from "./facets/facets.service.js";

@Module({
  controllers: [PropertiesController],
  providers: [
    PropertiesService,
    PropertiesRepository,
    PricePeriodsRepository,
    FacetsService,
  ],
  exports: [PropertiesService, PropertiesRepository, PricePeriodsRepository],
})
export class PropertiesModule {}
