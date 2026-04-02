import {
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  Req,
  Headers,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { Request } from "express";
import { WebhooksService } from "./webhooks.service";
import { UnknownEntityError } from "../../events/unknown-entity.error";

@Controller("webhooks")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post(":partnerId/events")
  @HttpCode(HttpStatus.OK)
  async receiveEvent(
    @Param("partnerId") partnerId: string,
    @Headers("x-travelhub-signature") signature: string | undefined,
    @Req() req: Request,
  ) {
    try {
      const rawBody = req.body as Buffer;
      return await this.webhooksService.processEvent(
        partnerId,
        rawBody,
        signature,
      );
    } catch (err) {
      if (err instanceof UnknownEntityError) {
        throw new UnprocessableEntityException(err.message);
      }
      // Re-throw NestJS HTTP exceptions (NotFoundException, UnauthorizedException, etc.)
      if (typeof err === "object" && err !== null && "status" in err) throw err;
      this.logger.error("Unexpected error processing webhook", err);
      throw new InternalServerErrorException("Internal server error");
    }
  }
}
