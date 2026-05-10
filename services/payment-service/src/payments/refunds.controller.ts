import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
} from "@nestjs/common";
import { RefundsService } from "./refunds.service.js";
import { IssueRefundDto } from "./dto/issue-refund.dto.js";

@Controller("payments")
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post(":reservationId/refund")
  @HttpCode(HttpStatus.OK)
  issueRefund(
    @Param("reservationId") reservationId: string,
    @Body() dto: IssueRefundDto,
    @Ip() ip: string,
  ) {
    return this.refundsService.issueRefund({
      reservationId,
      reason: dto.reason,
      actorId: dto.actorId ?? null,
      actorRole: dto.actorRole ?? null,
      requestIp: ip || null,
    });
  }
}
