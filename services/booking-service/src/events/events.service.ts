import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import * as amqp from "amqplib";
import { InventoryClient } from "../clients/inventory.client.js";
import { PartnerFeesRepository } from "../partner-fees/partner-fees.repository.js";

// Lazily imported when MESSAGE_BROKER_TYPE=pubsub

type PubSubSubscription = any;

type EventHandler = (payload: unknown) => Promise<void>;

interface Subscription {
  queue: string;
  routingKey: string;
  handler: EventHandler;
}

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);

  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private pubSubSubscriptions: PubSubSubscription[] = [];

  constructor(
    private readonly inventoryClient: InventoryClient,
    private readonly partnerFees: PartnerFeesRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokerType = process.env.MESSAGE_BROKER_TYPE ?? "rabbitmq";

    const subscriptions: Subscription[] = [
      {
        queue: "booking.inventory.room.upserted",
        routingKey: "inventory.room.upserted",
        handler: (p) => {
          const event = p as { snapshot: RoomUpsertedPayload };
          return this.handleRoomUpserted(event.snapshot);
        },
      },
      {
        queue: "booking.partner.fee.upserted",
        routingKey: "partner.fee.upserted",
        handler: (p) => this.handleFeeUpserted(p as PartnerFeeUpsertedPayload),
      },
      {
        queue: "booking.partner.fee.deleted",
        routingKey: "partner.fee.deleted",
        handler: (p) => this.handleFeeDeleted(p as PartnerFeeDeletedPayload),
      },
    ];

    if (brokerType === "pubsub") {
      await this.connectPubSub(subscriptions);
    } else if (brokerType === "rabbitmq") {
      await this.connectRabbitMQ(subscriptions);
    } else {
      this.logger.warn(
        `MESSAGE_BROKER_TYPE=${brokerType} is not supported; use rabbitmq or pubsub.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      for (const sub of this.pubSubSubscriptions) {
        sub.removeAllListeners();
        await sub.close();
      }
    } catch {
      // ignore close errors during shutdown
    }
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async handleRoomUpserted(snapshot: RoomUpsertedPayload): Promise<void> {
    await this.inventoryClient.cacheRoomLocation(snapshot.roomId, {
      country: snapshot.country,
      city: snapshot.city,
    });
    this.logger.debug(
      `Updated location cache for room ${snapshot.roomId} (${snapshot.country}/${snapshot.city})`,
    );
  }

  async handleFeeUpserted(event: PartnerFeeUpsertedPayload): Promise<void> {
    await this.partnerFees.upsertFromEvent(event);
    this.logger.debug(
      `Upserted partner fee ${event.feeId} for partner ${event.partnerId}`,
    );
  }

  async handleFeeDeleted(event: PartnerFeeDeletedPayload): Promise<void> {
    await this.partnerFees.softDelete(event.feeId);
    this.logger.debug(`Soft-deleted partner fee ${event.feeId}`);
  }

  // ─── RabbitMQ ────────────────────────────────────────────────────────────────

  private async connectRabbitMQ(subscriptions: Subscription[]): Promise<void> {
    const url =
      process.env.MESSAGE_BROKER_URL ?? "amqp://guest:guest@localhost:5672";

    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      const exchange = "travelhub";
      await this.channel.assertExchange(exchange, "topic", { durable: true });

      for (const sub of subscriptions) {
        await this.subscribeRabbitMQ(
          sub.queue,
          exchange,
          sub.routingKey,
          sub.handler,
        );
      }

      this.logger.log("Connected to RabbitMQ and consuming inventory events");
    } catch (error) {
      this.logger.error(`Failed to connect to RabbitMQ: ${String(error)}`);
    }
  }

  private async subscribeRabbitMQ(
    queue: string,
    exchange: string,
    routingKey: string,
    handler: EventHandler,
  ): Promise<void> {
    await this.channel!.assertQueue(queue, { durable: true });
    await this.channel!.bindQueue(queue, exchange, routingKey);
    await this.channel!.consume(queue, (msg) => {
      if (!msg) return;
      this.dispatchRabbitMQ(msg, handler);
    });
  }

  private dispatchRabbitMQ(msg: amqp.Message, handler: EventHandler): void {
    let payload: unknown;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      this.logger.error("Failed to parse message payload");
      this.channel?.nack(msg, false, false);
      return;
    }

    handler(payload)
      .then(() => this.channel?.ack(msg))
      .catch((err: unknown) => {
        this.logger.error(`Error handling event: ${String(err)}`);
        this.channel?.nack(msg, false, true);
      });
  }

  // ─── Google Pub/Sub ──────────────────────────────────────────────────────────

  private async connectPubSub(subscriptions: Subscription[]): Promise<void> {
    try {
      const { PubSub } = await import("@google-cloud/pubsub" as string);
      const client = new PubSub({ projectId: process.env.PUBSUB_PROJECT_ID });

      for (const sub of subscriptions) {
        const subscriptionName = sub.queue.replace(/\./g, "-");
        const subscription = client.subscription(subscriptionName);

        subscription.on("message", (message: any) => {
          let payload: unknown;
          try {
            payload = JSON.parse(message.data.toString());
          } catch {
            this.logger.error("Failed to parse Pub/Sub message payload");
            message.nack();
            return;
          }
          sub
            .handler(payload)
            .then(() => message.ack())
            .catch((err: unknown) => {
              this.logger.error(`Error handling Pub/Sub event: ${String(err)}`);
              message.nack();
            });
        });

        subscription.on("error", (err: unknown) => {
          this.logger.error(
            `Pub/Sub subscription error [${subscriptionName}]: ${String(err)}`,
          );
        });

        this.pubSubSubscriptions.push(subscription);
      }

      this.logger.log(
        "Connected to Google Pub/Sub and consuming inventory events",
      );
    } catch (error) {
      this.logger.error(`Failed to connect to Pub/Sub: ${String(error)}`);
    }
  }
}

// ─── Payload types ────────────────────────────────────────────────────────────

interface RoomUpsertedPayload {
  roomId: string;
  propertyId: string;
  country: string;
  city: string;
}

interface PartnerFeeUpsertedPayload {
  feeId: string;
  partnerId: string;
  propertyId?: string;
  feeName: string;
  feeType: string;
  rate?: number;
  flatAmount?: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

interface PartnerFeeDeletedPayload {
  feeId: string;
  partnerId: string;
}
