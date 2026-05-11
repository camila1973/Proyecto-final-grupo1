import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import * as amqp from "amqplib";
import { AppService } from "../app.service.js";
import type { BookingEvent, BookingRoutingKey } from "./types.js";
import { templates } from "./templates/index.js";

type PubSubSubscription = import("@google-cloud/pubsub").Subscription;

type EventHandler = (payload: unknown) => Promise<void>;

interface Subscription {
  /** Logical queue name — doubles as the Pub/Sub subscription name (dots → hyphens). */
  queue: string;
  /** AMQP routing key — doubles as the Pub/Sub topic name (dots → hyphens). */
  routingKey: BookingRoutingKey;
  handler: EventHandler;
}

const ROUTING_KEYS: BookingRoutingKey[] = [
  "booking.cancelled",
  "booking.confirmed",
  "booking.checked_in",
  "booking.checked_out",
  "booking.failed",
  "booking.expired",
  "booking.no_show",
];

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);

  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private pubSubSubscriptions: PubSubSubscription[] = [];

  constructor(private readonly app: AppService) {}

  async onModuleInit(): Promise<void> {
    const brokerType = process.env.MESSAGE_BROKER_TYPE ?? "rabbitmq";

    const subscriptions: Subscription[] = ROUTING_KEYS.map((routingKey) => ({
      queue: `notification.${routingKey}`,
      routingKey,
      handler: (payload) => this.handle(routingKey, payload),
    }));

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

  // ─── Handler ────────────────────────────────────────────────────────────────

  handle(routingKey: BookingRoutingKey, payload: unknown): Promise<void> {
    const event = payload as BookingEvent;
    const renderer = templates[routingKey];
    if (!renderer) {
      this.logger.debug(`No template for ${routingKey}; ignoring`);
      return Promise.resolve();
    }
    const message = renderer(event);
    if (!message) {
      this.logger.debug(
        `Template for ${routingKey} returned null for actor=${event.actor}; ignoring`,
      );
      return Promise.resolve();
    }
    this.app.sendNotification({
      userId: event.bookerId,
      to: message.to,
      channel: message.channel,
      subject: message.subject,
      message: message.body,
      ...(message.html ? { html: message.html } : {}),
    });
    return Promise.resolve();
  }

  // ─── RabbitMQ ───────────────────────────────────────────────────────────────

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

      this.logger.log("Connected to RabbitMQ and consuming booking events");
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

  // ─── Google Pub/Sub ─────────────────────────────────────────────────────────

  private async connectPubSub(subscriptions: Subscription[]): Promise<void> {
    try {
      const { PubSub } = await import("@google-cloud/pubsub");
      const client = new PubSub({ projectId: process.env.PUBSUB_PROJECT_ID });

      for (const sub of subscriptions) {
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

      this.logger.log(
        "Connected to Google Pub/Sub and consuming booking events",
      );
    } catch (error) {
      this.logger.error(`Failed to connect to Pub/Sub: ${String(error)}`);
    }
  }
}
