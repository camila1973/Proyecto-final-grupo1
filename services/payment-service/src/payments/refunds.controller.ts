import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
} from "@nestjs/common";
import { RefundsService } from "./refunds.service.js";
import { IssueRefundDto } from "./dto/issue-refund.dto.js";
import { resolveClientIp } from "./resolve-client-ip.js";

@Controller("payments")
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post(":reservationId/refund")
  @HttpCode(HttpStatus.OK)
  issueRefund(
    @Param("reservationId") reservationId: string,
    @Body() dto: IssueRefundDto,
    @Headers("x-forwarded-for") forwardedFor: string,
    @Ip() directIp: string,
  ) {
    return this.refundsService.issueRefund({
      reservationId,
      reason: dto.reason,
      actorId: dto.actorId ?? null,
      actorRole: dto.actorRole ?? null,
      requestIp: resolveClientIp(forwardedFor, directIp),
    });
  }
}
