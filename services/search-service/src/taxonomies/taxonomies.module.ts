import { Module } from "@nestjs/common";
import { TaxonomiesController } from "./taxonomies.controller.js";
import { TaxonomiesService } from "./taxonomies.service.js";

@Module({
  controllers: [TaxonomiesController],
  providers: [TaxonomiesService],
  exports: [TaxonomiesService],
})
export class TaxonomiesModule {}
