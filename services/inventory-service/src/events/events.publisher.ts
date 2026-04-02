import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import * as amqplib from "amqplib";

@Injectable()
export class EventsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsPublisher.name);
  private connection: amqplib.ChannelModel | null = null;
  private channel: amqplib.Channel | null = null;

  async onModuleInit(): Promise<void> {
    try {
      this.connection = await amqplib.connect(
        process.env.RABBITMQ_URL ?? "amqp://localhost:5672",
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

  publish(routingKey: string, payload: unknown): void {
    if (!this.channel) return;
    this.channel.publish(
      "travelhub",
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // ignore cleanup errors
    }
  }
}
