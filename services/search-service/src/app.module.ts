import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module.js";
import { CacheModule } from "./cache/cache.module.js";
import { HealthController } from "./health/health.controller.js";
import { TaxonomiesModule } from "./taxonomies/taxonomies.module.js";
import { PropertiesModule } from "./properties/properties.module.js";
import { EventsModule } from "./events/events.module.js";

@Module({
  imports: [
    DatabaseModule,
    CacheModule,
    TaxonomiesModule,
    PropertiesModule,
    EventsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
