import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import * as amqp from "amqplib";
import {
  RoomUpsertedHandler,
  type RoomUpsertedPayload,
} from "./handlers/room-upserted.handler.js";
import {
  AvailabilityUpdatedHandler,
  type AvailabilityUpdatedPayload,
} from "./handlers/availability-updated.handler.js";
import {
  RoomDeletedHandler,
  type RoomDeletedPayload,
} from "./handlers/room-deleted.handler.js";
import {
  TaxRuleUpsertedHandler,
  type TaxRuleUpsertedPayload,
} from "./handlers/tax-rule-upserted.handler.js";
import {
  TaxRuleDeletedHandler,
  type TaxRuleDeletedPayload,
} from "./handlers/tax-rule-deleted.handler.js";
import {
  PartnerFeeUpsertedHandler,
  type PartnerFeeUpsertedPayload,
} from "./handlers/partner-fee-upserted.handler.js";
import {
  PartnerFeeDeletedHandler,
  type PartnerFeeDeletedPayload,
} from "./handlers/partner-fee-deleted.handler.js";

// Lazily imported when MESSAGE_BROKER_TYPE=pubsub
type PubSubSubscription = import("@google-cloud/pubsub").Subscription;

type EventHandler = (payload: unknown) => Promise<void>;

interface Subscription {
  /** Logical queue name — doubles as the Pub/Sub subscription name (dots → hyphens) */
  queue: string;
  /** AMQP routing key — doubles as the Pub/Sub topic name (dots → hyphens) */
  routingKey: string;
  handler: EventHandler;
}

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);

  // RabbitMQ state
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  // Pub/Sub state
  private pubSubSubscriptions: PubSubSubscription[] = [];

  constructor(
    private readonly roomUpserted: RoomUpsertedHandler,
    private readonly availabilityUpdated: AvailabilityUpdatedHandler,
    private readonly roomDeleted: RoomDeletedHandler,
    private readonly taxRuleUpserted: TaxRuleUpsertedHandler,
    private readonly taxRuleDeleted: TaxRuleDeletedHandler,
    private readonly partnerFeeUpserted: PartnerFeeUpsertedHandler,
    private readonly partnerFeeDeleted: PartnerFeeDeletedHandler,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokerType = process.env.MESSAGE_BROKER_TYPE ?? "rabbitmq";

    const subscriptions: Subscription[] = [
      {
        queue: "search.inventory.room.upserted",
        routingKey: "inventory.room.upserted",
        handler: (p) => {
          const event = p as { snapshot: RoomUpsertedPayload };
          return this.roomUpserted.handle(event.snapshot);
        },
      },
      {
        queue: "search.inventory.price.updated",
        routingKey: "inventory.price.updated",
        handler: (p) =>
          this.availabilityUpdated.handle(p as AvailabilityUpdatedPayload),
      },
      {
        queue: "search.inventory.room.deleted",
        routingKey: "inventory.room.deleted",
        handler: (p) => this.roomDeleted.handle(p as RoomDeletedPayload),
      },
      {
        queue: "search.tax.rule.upserted",
        routingKey: "tax.rule.upserted",
        handler: (p) =>
          this.taxRuleUpserted.handle(p as TaxRuleUpsertedPayload),
      },
      {
        queue: "search.tax.rule.deleted",
        routingKey: "tax.rule.deleted",
        handler: (p) => this.taxRuleDeleted.handle(p as TaxRuleDeletedPayload),
      },
      {
        queue: "search.partner.fee.upserted",
        routingKey: "partner.fee.upserted",
        handler: (p) =>
          this.partnerFeeUpserted.handle(p as PartnerFeeUpsertedPayload),
      },
      {
        queue: "search.partner.fee.deleted",
        routingKey: "partner.fee.deleted",
        handler: (p) =>
          this.partnerFeeDeleted.handle(p as PartnerFeeDeletedPayload),
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

  // ─── RabbitMQ ──────────────────────────────────────────────────────────────

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

      this.logger.log("Connected to RabbitMQ and consuming events");
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

  // ─── Google Pub/Sub ────────────────────────────────────────────────────────

  private async connectPubSub(subscriptions: Subscription[]): Promise<void> {
    try {
      const { PubSub } = await import("@google-cloud/pubsub");
      const client = new PubSub({ projectId: process.env.PUBSUB_PROJECT_ID });

      for (const sub of subscriptions) {
        // Queue name dots become hyphens: "search.inventory.room.upserted" → "search-inventory-room-upserted"
        const subscriptionName = sub.queue.replace(/\./g, "-");
        const subscription = client.subscription(subscriptionName);

        subscription.on("message", (message) => {
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

        subscription.on("error", (err) => {
          this.logger.error(
            `Pub/Sub subscription error [${subscriptionName}]: ${String(err)}`,
          );
        });

        this.pubSubSubscriptions.push(subscription);
      }

      this.logger.log("Connected to Google Pub/Sub and consuming events");
    } catch (error) {
      this.logger.error(`Failed to connect to Pub/Sub: ${String(error)}`);
    }
  }
}
