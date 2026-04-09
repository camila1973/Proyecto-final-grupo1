import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Injectable,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import type { Request } from "express";
import { RoomRaccoonWebhookDto } from "./roomraccoon.types";
import { ExternalIdService } from "../../../external-id/external-id.service";
import { AvailabilityHandler } from "../../../events/handlers/availability.handler";
import { PriceHandler } from "../../../events/handlers/price.handler";

function verifyHmac(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string | undefined,
): void {
  if (!secret) return;
  if (!signature)
    throw new UnauthorizedException("Missing X-Webhook-Signature");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new UnauthorizedException("Invalid webhook signature");
  }
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class RoomRaccoonAdapterService {
  private readonly logger = new Logger(RoomRaccoonAdapterService.name);

  constructor(
    private readonly externalIdService: ExternalIdService,
    private readonly availabilityHandler: AvailabilityHandler,
    private readonly priceHandler: PriceHandler,
  ) {}

  async process(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ processed: number; skipped: number }> {
    verifyHmac(rawBody, signature, process.env.WEBHOOK_SECRET_ROOMRACCOON);

    const payload: RoomRaccoonWebhookDto = JSON.parse(
      rawBody.toString("utf-8"),
    ) as RoomRaccoonWebhookDto;

    if (!payload?.hotelId || !Array.isArray(payload.availability)) {
      throw new BadRequestException("Invalid RoomRaccoon payload");
    }

    let processed = 0;
    let skipped = 0;
    const partnerId = payload.hotelId;

    for (const av of payload.availability) {
      const roomId = await this.externalIdService.resolve(
        partnerId,
        "room",
        av.roomId,
      );
      if (!roomId) {
        this.logger.warn(
          `RoomRaccoon: no mapping for roomId=${av.roomId}, skipping`,
        );
        skipped++;
        continue;
      }

      if (av.price && av.available) {
        try {
          await this.priceHandler.handle(partnerId, {
            externalRoomId: av.roomId,
            fromDate: av.date,
            toDate: nextDay(av.date),
            amount: av.price,
            currency: av.currency ?? "USD",
          });
        } catch {
          // non-fatal
        }
      }

      await this.availabilityHandler.handle(partnerId, {
        externalRoomId: av.roomId,
        date: av.date,
        available: av.available,
      });

      processed++;
    }

    return { processed, skipped };
  }
}

@Controller("webhooks")
export class RoomRaccoonController {
  constructor(private readonly service: RoomRaccoonAdapterService) {}

  @Post("roomraccoon")
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers("x-webhook-signature") sig: string | undefined,
    @Req() req: Request,
  ) {
    return this.service.process(req.body as Buffer, sig);
  }
}
