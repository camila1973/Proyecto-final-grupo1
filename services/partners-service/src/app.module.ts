import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { FeesModule } from "./fees/fees.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";

@Module({
  imports: [FeesModule, DashboardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
