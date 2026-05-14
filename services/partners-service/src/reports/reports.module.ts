import { Module } from "@nestjs/common";
import { ClientsModule } from "../clients/clients.module.js";
import { PartnersModule } from "../partners/partners.module.js";
import { ReportsController } from "./reports.controller.js";
import { ReportsService } from "./reports.service.js";
import { PdfReportRenderer } from "./pdf-report.renderer.js";
import { XlsxReportRenderer } from "./xlsx-report.renderer.js";

@Module({
  imports: [ClientsModule, PartnersModule],
  controllers: [ReportsController],
  providers: [ReportsService, PdfReportRenderer, XlsxReportRenderer],
})
export class ReportsModule {}
