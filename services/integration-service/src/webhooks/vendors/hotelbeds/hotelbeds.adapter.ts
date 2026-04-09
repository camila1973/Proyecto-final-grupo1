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
import { HotelbedsWebhookDto } from "./hotelbeds.types";
import { ExternalIdService } from "../../../external-id/external-id.service";
import { AvailabilityHandler as AH } from "../../../events/handlers/availability.handler";
import { PriceHandler as PH } from "../../../events/handlers/price.handler";

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
export class HotelbedsAdapterService {
  private readonly logger = new Logger(HotelbedsAdapterService.name);

  constructor(
    private readonly externalIdService: ExternalIdService,
    private readonly availabilityHandler: AH,
    private readonly priceHandler: PH,
  ) {}

  async process(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ processed: number; skipped: number }> {
    verifyHmac(rawBody, signature, process.env.WEBHOOK_SECRET_HOTELBEDS);

    const payload: HotelbedsWebhookDto = JSON.parse(
      rawBody.toString("utf-8"),
    ) as HotelbedsWebhookDto;

    if (!payload?.hotelCode || !Array.isArray(payload.rooms)) {
      throw new BadRequestException("Invalid Hotelbeds payload");
    }

    let processed = 0;
    let skipped = 0;

    for (const room of payload.rooms) {
      const partnerId = payload.hotelCode;
      const roomId = await this.externalIdService.resolve(
        partnerId,
        "room",
        room.roomCode,
      );
      if (!roomId) {
        this.logger.warn(
          `Hotelbeds: no mapping for roomCode=${room.roomCode}, skipping`,
        );
        skipped++;
        continue;
      }

      if (room.rate && !room.stopSell) {
        try {
          await this.priceHandler.handle(partnerId, {
            externalRoomId: room.roomCode,
            fromDate: room.date,
            toDate: nextDay(room.date),
            amount: room.rate,
            currency: room.currency ?? "USD",
          });
        } catch {
          // overlap is non-fatal
        }
      }

      await this.availabilityHandler.handle(partnerId, {
        externalRoomId: room.roomCode,
        date: room.date,
        available: !room.stopSell,
      });

      processed++;
    }

    return { processed, skipped };
  }
}

@Controller("webhooks")
export class HotelbedsController {
  constructor(private readonly service: HotelbedsAdapterService) {}

  @Post("hotelbeds")
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers("x-webhook-signature") sig: string | undefined,
    @Req() req: Request,
  ) {
    return this.service.process(req.body as Buffer, sig);
  }
}
