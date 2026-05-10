import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller.js";
import { PaymentsService } from "./payments.service.js";
import { PaymentsRepository } from "./payments.repository.js";
import { RefundsController } from "./refunds.controller.js";
import { RefundsService } from "./refunds.service.js";
import { RefundsRepository } from "./refunds.repository.js";
import { ClientsModule } from "../clients/clients.module.js";
import { CommissionRulesModule } from "../commission-rules/commission-rules.module.js";

@Module({
  imports: [ClientsModule, CommissionRulesModule],
  controllers: [PaymentsController, RefundsController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    RefundsService,
    RefundsRepository,
  ],
})
export class PaymentsModule {}
