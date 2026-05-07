import { Module } from "@nestjs/common";
import { DisbursementsController } from "./disbursements.controller.js";
import { DisbursementsService } from "./disbursements.service.js";
import { DisbursementsRepository } from "./disbursements.repository.js";

@Module({
  controllers: [DisbursementsController],
  providers: [DisbursementsService, DisbursementsRepository],
  exports: [DisbursementsService],
})
export class DisbursementsModule {}
