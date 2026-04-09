import { Module } from "@nestjs/common";
import { TaxRateCacheRepository } from "./tax-rate-cache.repository.js";

@Module({
  providers: [TaxRateCacheRepository],
  exports: [TaxRateCacheRepository],
})
export class TaxRateCacheModule {}
