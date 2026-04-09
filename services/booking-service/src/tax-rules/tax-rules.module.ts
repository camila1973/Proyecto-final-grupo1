import { Module } from "@nestjs/common";
import { TaxRulesController } from "./tax-rules.controller.js";
import { TaxRulesService } from "./tax-rules.service.js";
import { TaxRulesRepository } from "./tax-rules.repository.js";
import { PublisherModule } from "../events/publisher.module.js";

@Module({
  imports: [PublisherModule],
  controllers: [TaxRulesController],
  providers: [TaxRulesService, TaxRulesRepository],
  exports: [TaxRulesRepository],
})
export class TaxRulesModule {}
