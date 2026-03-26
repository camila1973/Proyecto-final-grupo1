import { Module } from "@nestjs/common";
import { EventsService } from "./events.service.js";
import { RoomUpsertedHandler } from "./handlers/room-upserted.handler.js";
import { AvailabilityUpdatedHandler } from "./handlers/availability-updated.handler.js";
import { TaxonomyUpdatedHandler } from "./handlers/taxonomy-updated.handler.js";
import { PropertiesModule } from "../properties/properties.module.js";
import { TaxonomiesModule } from "../taxonomies/taxonomies.module.js";

@Module({
  imports: [PropertiesModule, TaxonomiesModule],
  providers: [
    EventsService,
    RoomUpsertedHandler,
    AvailabilityUpdatedHandler,
    TaxonomyUpdatedHandler,
  ],
})
export class EventsModule {}
