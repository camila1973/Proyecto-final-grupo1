import { Module } from "@nestjs/common";
import { TaxonomiesController } from "./taxonomies.controller.js";
import { TaxonomiesService } from "./taxonomies.service.js";
import { TaxonomiesRepository } from "./taxonomies.repository.js";

@Module({
  controllers: [TaxonomiesController],
  providers: [TaxonomiesService, TaxonomiesRepository],
  exports: [TaxonomiesService],
})
export class TaxonomiesModule {}
