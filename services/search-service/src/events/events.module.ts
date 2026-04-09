import { Module } from "@nestjs/common";
import { EventsService } from "./events.service.js";
import { RoomUpsertedHandler } from "./handlers/room-upserted.handler.js";
import { AvailabilityUpdatedHandler } from "./handlers/availability-updated.handler.js";
import { RoomDeletedHandler } from "./handlers/room-deleted.handler.js";
import { TaxRuleUpsertedHandler } from "./handlers/tax-rule-upserted.handler.js";
import { TaxRuleDeletedHandler } from "./handlers/tax-rule-deleted.handler.js";
import { PartnerFeeUpsertedHandler } from "./handlers/partner-fee-upserted.handler.js";
import { PartnerFeeDeletedHandler } from "./handlers/partner-fee-deleted.handler.js";
import { PropertiesModule } from "../properties/properties.module.js";
import { TaxonomiesModule } from "../taxonomies/taxonomies.module.js";
import { BookingModule } from "../booking/booking.module.js";

@Module({
  imports: [PropertiesModule, TaxonomiesModule, BookingModule],
  providers: [
    EventsService,
    RoomUpsertedHandler,
    AvailabilityUpdatedHandler,
    RoomDeletedHandler,
    TaxRuleUpsertedHandler,
    TaxRuleDeletedHandler,
    PartnerFeeUpsertedHandler,
    PartnerFeeDeletedHandler,
  ],
})
export class EventsModule {}
