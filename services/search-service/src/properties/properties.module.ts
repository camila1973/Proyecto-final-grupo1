import { Module } from "@nestjs/common";
import { PropertiesController } from "./properties.controller.js";
import { PropertiesService } from "./properties.service.js";
import { FacetsService } from "./facets/facets.service.js";

@Module({
  controllers: [PropertiesController],
  providers: [PropertiesService, FacetsService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
