import { Module } from "@nestjs/common";
import { CommissionRulesRepository } from "./commission-rules.repository.js";
import { CommissionRulesService } from "./commission-rules.service.js";

@Module({
  providers: [CommissionRulesRepository, CommissionRulesService],
  exports: [CommissionRulesService, CommissionRulesRepository],
})
export class CommissionRulesModule {}
