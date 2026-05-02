import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { MembersService } from "./members.service.js";
import { InviteMemberDto } from "./dto/invite-member.dto.js";

@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  findAll(
    @Query("partnerId") partnerId?: string,
    @Query("propertyId") propertyId?: string,
  ) {
    if (propertyId) return this.membersService.findByProperty(propertyId);
    if (partnerId) return this.membersService.findByPartnerEnriched(partnerId);
    return [];
  }

  @Post("invite")
  @HttpCode(HttpStatus.CREATED)
  invite(@Body() dto: InviteMemberDto) {
    return this.membersService.invite(dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.membersService.remove(id);
  }
}
