import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { CsvImportController } from "./csv-import.controller";
import { CsvImportService } from "./csv-import.service";
import { CsvImportProcessor } from "./csv-import.processor";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [BullModule.registerQueue({ name: "csv-import" }), EventsModule],
  controllers: [CsvImportController],
  providers: [CsvImportService, CsvImportProcessor],
})
export class CsvImportModule {}
