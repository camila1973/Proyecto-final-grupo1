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

@Controller("partners")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get(":partnerId/members")
  findAll(
    @Param("partnerId") partnerId: string,
    @Query("propertyId") propertyId?: string,
  ) {
    if (propertyId) return this.membersService.findByProperty(propertyId);
    return this.membersService.findByPartnerEnriched(partnerId);
  }

  @Post(":partnerId/members/invite")
  @HttpCode(HttpStatus.CREATED)
  invite(@Param("partnerId") partnerId: string, @Body() dto: InviteMemberDto) {
    return this.membersService.invite(partnerId, dto);
  }

  @Delete(":partnerId/members/:memberId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param("partnerId") _partnerId: string,
    @Param("memberId") memberId: string,
  ) {
    return this.membersService.remove(memberId);
  }
}
