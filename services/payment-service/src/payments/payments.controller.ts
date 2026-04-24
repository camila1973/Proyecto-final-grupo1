import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { PaymentsService } from "./payments.service.js";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto.js";

// Inline interface avoids emitDecoratorMetadata issues with RawBodyRequest<T>
interface ReqWithRawBody {
  rawBody?: Buffer;
}

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("initiate")
  @HttpCode(HttpStatus.CREATED)
  initiate(@Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiate(dto);
  }

  /**
   * Stripe webhook — must receive raw body for signature verification.
   * rawBody is available because NestFactory.create is called with { rawBody: true }.
   */
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  webhook(
    @Headers("stripe-signature") sig: string,
    @Req() req: ReqWithRawBody,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody!, sig);
  }

  @Get(":reservationId/status")
  getStatus(@Param("reservationId") reservationId: string) {
    return this.paymentsService.getStatus(reservationId);
  }
}
