import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import * as amqplib from "amqplib";

// Lazily imported when MESSAGE_BROKER_TYPE=pubsub to avoid loading the GCP SDK
// in environments that don't need it (local dev with RabbitMQ).
type PubSubClient = import("@google-cloud/pubsub").PubSub;

@Injectable()
export class EventsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsPublisher.name);

  // RabbitMQ state
  private connection: amqplib.ChannelModel | null = null;
  private channel: amqplib.Channel | null = null;

  // Pub/Sub state
  private pubSubClient: PubSubClient | null = null;

  private brokerType: string = "rabbitmq";

  async onModuleInit(): Promise<void> {
    this.brokerType = process.env.MESSAGE_BROKER_TYPE ?? "rabbitmq";
    if (this.brokerType === "pubsub") {
      await this.initPubSub();
    } else {
      await this.initRabbitMQ();
    }
  }

  private async initRabbitMQ(): Promise<void> {
    try {
      this.connection = await amqplib.connect(
        process.env.MESSAGE_BROKER_URL ?? "amqp://localhost:5672",
      );
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange("travelhub", "topic", {
        durable: true,
      });
      this.logger.log("RabbitMQ connection established");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`RabbitMQ unavailable: ${msg}. Events will be dropped.`);
    }
  }

  private async initPubSub(): Promise<void> {
    try {
      const { PubSub } = await import("@google-cloud/pubsub" as string);
      this.pubSubClient = new PubSub({
        projectId: process.env.PUBSUB_PROJECT_ID,
      });
      this.logger.log("Google Pub/Sub client initialized");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Pub/Sub init failed: ${msg}. Events will be dropped.`);
    }
  }

  publish(routingKey: string, payload: unknown): void {
    if (this.brokerType === "pubsub") {
      void this.publishViaPubSub(routingKey, payload);
    } else {
      this.publishViaRabbitMQ(routingKey, payload);
    }
  }

  private publishViaRabbitMQ(routingKey: string, payload: unknown): void {
    if (!this.channel) return;
    this.channel.publish(
      "travelhub",
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
  }

  private async publishViaPubSub(
    routingKey: string,
    payload: unknown,
  ): Promise<void> {
    if (!this.pubSubClient) return;
    try {
      const topicName = routingKey.replace(/\./g, "-");
      await this.pubSubClient
        .topic(topicName)
        .publishMessage({ data: Buffer.from(JSON.stringify(payload)) });
    } catch (err: unknown) {
      this.logger.error(`Failed to publish to Pub/Sub: ${String(err)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      await this.pubSubClient?.close();
    } catch {
      // ignore cleanup errors
    }
  }
}
