import { Module } from "@nestjs/common";
import { MembersController } from "./members.controller.js";
import { MembersService } from "./members.service.js";
import { MembersRepository } from "./members.repository.js";
import { ClientsModule } from "../clients/clients.module.js";

@Module({
  imports: [ClientsModule],
  controllers: [MembersController],
  providers: [MembersService, MembersRepository],
  exports: [MembersRepository],
})
export class MembersModule {}
