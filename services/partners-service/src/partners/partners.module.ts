import { Module } from "@nestjs/common";
import { PartnersController } from "./partners.controller.js";
import { PartnersService } from "./partners.service.js";
import { PartnersRepository } from "./partners.repository.js";
import { ClientsModule } from "../clients/clients.module.js";
import { MembersModule } from "../members/members.module.js";
import { ExportsService } from "../exports/exports.service.js";
import { PaymentsPdfRenderer } from "../exports/payments-pdf.renderer.js";
import { PaymentsCsvRenderer } from "../exports/payments-csv.renderer.js";
import { DisbursementPdfRenderer } from "../exports/disbursement-pdf.renderer.js";
import { DisbursementCsvRenderer } from "../exports/disbursement-csv.renderer.js";

@Module({
  imports: [ClientsModule, MembersModule],
  controllers: [PartnersController],
  providers: [
    PartnersService,
    PartnersRepository,
    ExportsService,
    PaymentsPdfRenderer,
    PaymentsCsvRenderer,
    DisbursementPdfRenderer,
    DisbursementCsvRenderer,
  ],
  exports: [PartnersService, PartnersRepository],
})
export class PartnersModule {}
