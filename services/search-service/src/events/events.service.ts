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
import { TaxonomyUpdatedHandler } from "./handlers/taxonomy-updated.handler.js";

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    private readonly roomUpserted: RoomUpsertedHandler,
    private readonly availabilityUpdated: AvailabilityUpdatedHandler,
    private readonly taxonomyUpdated: TaxonomyUpdatedHandler,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokerType = process.env.MESSAGE_BROKER_TYPE ?? "rabbitmq";
    if (brokerType !== "rabbitmq") {
      this.logger.warn(
        `MESSAGE_BROKER_TYPE=${brokerType} is not yet supported; only rabbitmq is implemented.`,
      );
      return;
    }
    await this.connectRabbitMQ();
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // ignore close errors during shutdown
    }
  }

  private async connectRabbitMQ(): Promise<void> {
    const url =
      process.env.MESSAGE_BROKER_URL ?? "amqp://guest:guest@localhost:5672";

    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      const exchange = "travelhub";
      await this.channel.assertExchange(exchange, "topic", { durable: true });

      await this.subscribe(
        "search.inventory.room.upserted",
        exchange,
        "inventory.room.upserted",
        (p) => this.roomUpserted.handle(p as RoomUpsertedPayload),
      );

      await this.subscribe(
        "search.price.updated",
        exchange,
        "price.updated",
        (p) => this.availabilityUpdated.handle(p as AvailabilityUpdatedPayload),
      );

      await this.subscribe(
        "search.taxonomy.updated",
        exchange,
        "taxonomy.updated",
        () => this.taxonomyUpdated.handle(),
      );

      this.logger.log("Connected to RabbitMQ and consuming events");
    } catch (error) {
      this.logger.error(`Failed to connect to RabbitMQ: ${String(error)}`);
    }
  }

  private async subscribe(
    queue: string,
    exchange: string,
    routingKey: string,
    handler: (payload: unknown) => Promise<void>,
  ): Promise<void> {
    await this.channel!.assertQueue(queue, { durable: true });
    await this.channel!.bindQueue(queue, exchange, routingKey);
    await this.channel!.consume(queue, (msg) => {
      if (!msg) return;
      this.dispatch(msg, handler);
    });
  }

  private dispatch(
    msg: amqp.Message,
    handler: (payload: unknown) => Promise<void>,
  ): void {
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
}
