import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { Kysely } from "kysely";
import { KYSELY } from "../../database/database.provider";
import { Database } from "../../database/database.types";
import { PropertyHandler } from "../../events/handlers/property.handler";
import { RoomHandler } from "../../events/handlers/room.handler";
import { AvailabilityHandler } from "../../events/handlers/availability.handler";
import { PriceHandler } from "../../events/handlers/price.handler";
import { BookingHandler } from "../../events/handlers/booking.handler";
import { HoldHandler } from "../../events/handlers/hold.handler";
import { UnknownEntityError } from "../../events/unknown-entity.error";

export interface WebhookEnvelope {
  eventId: string;
  eventType: string;
  occurredAt: string;
  data: unknown;
}

export type WebhookResponse = { status: "ok" } | { status: "duplicate" };

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @Inject(KYSELY) private readonly db: Kysely<Database>,
    private readonly propertyHandler: PropertyHandler,
    private readonly roomHandler: RoomHandler,
    private readonly availabilityHandler: AvailabilityHandler,
    private readonly priceHandler: PriceHandler,
    private readonly bookingHandler: BookingHandler,
    private readonly holdHandler: HoldHandler,
  ) {}

  async processEvent(
    partnerId: string,
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<WebhookResponse> {
    // 1. Look up PMS registration
    const registration = await this.db
      .selectFrom("pmsRegistrations")
      .selectAll()
      .where("partnerId", "=", partnerId)
      .executeTakeFirst();

    if (!registration || !registration.enabled) {
      throw new NotFoundException(`Partner not found: ${partnerId}`);
    }

    // 2. Verify HMAC signature
    this.verifySignature(rawBody, signature, registration.signingSecret);

    // 3. Parse raw body

    const envelope: WebhookEnvelope = JSON.parse(
      rawBody.toString("utf-8"),
    ) as WebhookEnvelope;

    // 4. Validate envelope shape
    if (
      !envelope.eventId ||
      !envelope.eventType ||
      !envelope.occurredAt ||
      envelope.data === undefined
    ) {
      throw new Error("Invalid webhook envelope: missing required fields");
    }

    // 5. Idempotency check
    const alreadyProcessed = await this.db
      .selectFrom("processedEvents")
      .select("id")
      .where("partnerId", "=", partnerId)
      .where("eventId", "=", envelope.eventId)
      .executeTakeFirst();

    if (alreadyProcessed) {
      return { status: "duplicate" };
    }

    // 6. Route to handler
    await this.routeEvent(partnerId, envelope.eventType, envelope.data);

    // 7. Mark as processed
    await this.db
      .insertInto("processedEvents")
      .values({ partnerId, eventId: envelope.eventId })
      .execute();

    return { status: "ok" };
  }

  private verifySignature(
    rawBody: Buffer,
    signature: string | undefined,
    secret: string,
  ): void {
    if (!signature) {
      throw new UnauthorizedException("Missing X-TravelHub-Signature header");
    }
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new UnauthorizedException("Invalid webhook signature");
    }
  }

  private async routeEvent(
    partnerId: string,
    eventType: string,
    data: unknown,
  ): Promise<void> {
    switch (eventType) {
      case "property.created":
      case "property.updated":
        await this.propertyHandler.handle(partnerId, eventType, data);
        break;
      case "room.created":
      case "room.updated":
        await this.roomHandler.handle(partnerId, eventType, data);
        break;
      case "room.availability.updated":
        await this.availabilityHandler.handle(partnerId, data);
        break;
      case "room.price.updated":
        await this.priceHandler.handle(partnerId, data);
        break;
      case "booking.confirmed":
        await this.bookingHandler.handle(partnerId, data);
        break;
      case "hold.created":
      case "hold.released":
        await this.holdHandler.handle(partnerId, eventType, data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${eventType}`);
    }
  }

  isUnknownEntityError(err: unknown): err is UnknownEntityError {
    return err instanceof UnknownEntityError;
  }
}
