import { Module } from "@nestjs/common";
import { ExternalIdService } from "./external-id.service";

@Module({
  providers: [ExternalIdService],
  exports: [ExternalIdService],
})
export class ExternalIdModule {}
