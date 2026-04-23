import { Module } from "@nestjs/common";
import { EventsService } from "./events.service.js";
import { ClientsModule } from "../clients/clients.module.js";
import { PartnerFeesModule } from "../partner-fees/partner-fees.module.js";

@Module({
  imports: [ClientsModule, PartnerFeesModule],
  providers: [EventsService],
})
export class EventsModule {}
