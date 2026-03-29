import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { WebhooksService } from "./webhooks.service";
import type {
  HotelbedsWebhookDto,
  TravelClickWebhookDto,
  RoomRaccoonWebhookDto,
} from "./webhooks.types";

function verifyHmac(
  rawBody: string,
  signature: string | undefined,
  secret: string | undefined,
): void {
  if (!secret) return; // secret not configured — skip validation
  if (!signature)
    throw new UnauthorizedException("Missing X-Webhook-Signature");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new UnauthorizedException("Invalid webhook signature");
  }
}

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post("hotelbeds")
  @HttpCode(HttpStatus.OK)
  hotelbeds(
    @Headers("x-webhook-signature") sig: string | undefined,
    @Body() payload: HotelbedsWebhookDto,
  ) {
    verifyHmac(
      JSON.stringify(payload),
      sig,
      process.env.WEBHOOK_SECRET_HOTELBEDS,
    );
    if (!payload?.hotelCode || !Array.isArray(payload.rooms)) {
      throw new BadRequestException("Invalid Hotelbeds payload");
    }
    return this.webhooksService.processHotelbeds(payload);
  }

  @Post("travelclick")
  @HttpCode(HttpStatus.OK)
  travelclick(
    @Headers("x-webhook-signature") sig: string | undefined,
    @Body() payload: TravelClickWebhookDto,
  ) {
    verifyHmac(
      JSON.stringify(payload),
      sig,
      process.env.WEBHOOK_SECRET_TRAVELCLICK,
    );
    if (!payload?.propertyCode || !Array.isArray(payload.roomTypes)) {
      throw new BadRequestException("Invalid TravelClick payload");
    }
    return this.webhooksService.processTravelClick(payload);
  }

  @Post("roomraccoon")
  @HttpCode(HttpStatus.OK)
  roomraccoon(
    @Headers("x-webhook-signature") sig: string | undefined,
    @Body() payload: RoomRaccoonWebhookDto,
  ) {
    verifyHmac(
      JSON.stringify(payload),
      sig,
      process.env.WEBHOOK_SECRET_ROOMRACCOON,
    );
    if (!payload?.hotelId || !Array.isArray(payload.availability)) {
      throw new BadRequestException("Invalid RoomRaccoon payload");
    }
    return this.webhooksService.processRoomRaccoon(payload);
  }
}
