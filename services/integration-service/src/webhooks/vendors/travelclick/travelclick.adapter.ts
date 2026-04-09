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
import { TravelClickWebhookDto } from "./travelclick.types";
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

@Injectable()
export class TravelClickAdapterService {
  private readonly logger = new Logger(TravelClickAdapterService.name);

  constructor(
    private readonly externalIdService: ExternalIdService,
    private readonly availabilityHandler: AvailabilityHandler,
    private readonly priceHandler: PriceHandler,
  ) {}

  async process(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ processed: number; skipped: number }> {
    verifyHmac(rawBody, signature, process.env.WEBHOOK_SECRET_TRAVELCLICK);

    const payload: TravelClickWebhookDto = JSON.parse(
      rawBody.toString("utf-8"),
    ) as TravelClickWebhookDto;

    if (!payload?.propertyCode || !Array.isArray(payload.roomTypes)) {
      throw new BadRequestException("Invalid TravelClick payload");
    }

    let processed = 0;
    let skipped = 0;
    const partnerId = payload.propertyCode;

    for (const rt of payload.roomTypes) {
      const roomId = await this.externalIdService.resolve(
        partnerId,
        "room",
        rt.roomTypeCode,
      );
      if (!roomId) {
        this.logger.warn(
          `TravelClick: no mapping for roomTypeCode=${rt.roomTypeCode}, skipping`,
        );
        skipped++;
        continue;
      }

      if (rt.rateAmount && !rt.closed) {
        try {
          await this.priceHandler.handle(partnerId, {
            externalRoomId: rt.roomTypeCode,
            fromDate: rt.startDate,
            toDate: rt.endDate,
            amount: rt.rateAmount,
            currency: rt.currencyCode ?? "USD",
          });
        } catch {
          // non-fatal
        }
      }

      for (
        let d = new Date(rt.startDate);
        d <= new Date(rt.endDate);
        d.setUTCDate(d.getUTCDate() + 1)
      ) {
        await this.availabilityHandler.handle(partnerId, {
          externalRoomId: rt.roomTypeCode,
          date: d.toISOString().slice(0, 10),
          available: !rt.closed,
        });
      }

      processed++;
    }

    return { processed, skipped };
  }
}

@Controller("webhooks")
export class TravelClickController {
  constructor(private readonly service: TravelClickAdapterService) {}

  @Post("travelclick")
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers("x-webhook-signature") sig: string | undefined,
    @Req() req: Request,
  ) {
    return this.service.process(req.body as Buffer, sig);
  }
}
