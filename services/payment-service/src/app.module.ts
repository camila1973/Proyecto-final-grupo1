import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { DatabaseModule } from "./database/database.module.js";
import { PaymentsModule } from "./payments/payments.module.js";
import { CommissionRulesModule } from "./commission-rules/commission-rules.module.js";
import { DisbursementsModule } from "./disbursements/disbursements.module.js";

@Module({
  imports: [
    DatabaseModule,
    PaymentsModule,
    CommissionRulesModule,
    DisbursementsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
