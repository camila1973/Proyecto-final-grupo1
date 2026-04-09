import { Module } from "@nestjs/common";
import { PartnerFeesService } from "./partner-fees.service.js";
import { PartnerFeesRepository } from "./partner-fees.repository.js";
import { InternalFeesController } from "./internal/internal-fees.controller.js";
import { PublisherModule } from "../events/publisher.module.js";

@Module({
  imports: [PublisherModule],
  controllers: [InternalFeesController],
  providers: [PartnerFeesService, PartnerFeesRepository],
  exports: [PartnerFeesRepository, PartnerFeesService],
})
export class PartnerFeesModule {}
