import { Module } from "@nestjs/common";
import { PriceValidationCacheRepository } from "./price-validation-cache.repository.js";

@Module({
  providers: [PriceValidationCacheRepository],
  exports: [PriceValidationCacheRepository],
})
export class PriceValidationCacheModule {}
