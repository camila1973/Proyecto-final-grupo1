import { Module } from "@nestjs/common";
import { PartnersController } from "./partners.controller.js";
import { PartnersService } from "./partners.service.js";
import { PartnersRepository } from "./partners.repository.js";
import { ClientsModule } from "../clients/clients.module.js";
import { MembersModule } from "../members/members.module.js";

@Module({
  imports: [ClientsModule, MembersModule],
  controllers: [PartnersController],
  providers: [PartnersService, PartnersRepository],
  exports: [PartnersService],
})
export class PartnersModule {}
