import { Module } from "@nestjs/common";
import { PartnerFeesCacheRepository } from "./partner-fees-cache.repository.js";

@Module({
  providers: [PartnerFeesCacheRepository],
  exports: [PartnerFeesCacheRepository],
})
export class PartnerFeesCacheModule {}
