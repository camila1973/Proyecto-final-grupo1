import { Module } from "@nestjs/common";
import { CommissionRulesController } from "./commission-rules.controller.js";
import { CommissionRulesRepository } from "./commission-rules.repository.js";
import { CommissionRulesService } from "./commission-rules.service.js";

@Module({
  controllers: [CommissionRulesController],
  providers: [CommissionRulesRepository, CommissionRulesService],
  exports: [CommissionRulesService, CommissionRulesRepository],
})
export class CommissionRulesModule {}
