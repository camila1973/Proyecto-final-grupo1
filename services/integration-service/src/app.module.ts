import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { ExternalIdModule } from "./external-id/external-id.module";
import { WebhooksModule } from "./webhooks/generic/webhooks.module";
import { VendorsModule } from "./webhooks/vendors/vendors.module";
import { CsvImportModule } from "./csv-import/csv-import.module";
import { FxModule } from "./fx/fx.module";
import { EventsModule } from "./events/events.module";

@Module({
  imports: [
    DatabaseModule,
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST ?? "localhost",
        port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
      },
    }),
    HealthModule,
    ExternalIdModule,
    EventsModule,
    WebhooksModule,
    VendorsModule,
    CsvImportModule,
    FxModule,
  ],
})
export class AppModule {}
