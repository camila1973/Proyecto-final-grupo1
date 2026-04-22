import { Module } from "@nestjs/common";
import { PropertiesController } from "./properties.controller.js";
import { PropertiesService } from "./properties.service.js";
import { PropertiesRepository } from "./properties.repository.js";
import { PricePeriodsRepository } from "./price-periods.repository.js";
import { ReviewsRepository } from "./reviews.repository.js";
import { FacetsService } from "./facets/facets.service.js";
import { InventoryModule } from "../inventory/inventory.module.js";

@Module({
  imports: [InventoryModule],
  controllers: [PropertiesController],
  providers: [
    PropertiesService,
    PropertiesRepository,
    PricePeriodsRepository,
    ReviewsRepository,
    FacetsService,
  ],
  exports: [
    PropertiesService,
    PropertiesRepository,
    PricePeriodsRepository,
    ReviewsRepository,
  ],
})
export class PropertiesModule {}
