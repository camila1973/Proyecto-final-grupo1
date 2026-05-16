// ─── amqplib mock ─────────────────────────────────────────────────────────────

const mockChannel = {
  assertExchange: jest.fn().mockResolvedValue({}),
  publish: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockConnection = {
  createChannel: jest.fn().mockResolvedValue(mockChannel),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock("amqplib", () => ({
  connect: jest.fn().mockResolvedValue(mockConnection),
}));

// ─── @google-cloud/pubsub mock ────────────────────────────────────────────────

const mockTopic = {
  publishMessage: jest.fn().mockResolvedValue("msg-id"),
};

const mockPubSubInstance = {
  topic: jest.fn().mockReturnValue(mockTopic),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock("@google-cloud/pubsub", () => {
  return {
    PubSub: jest.fn().mockImplementation(() => mockPubSubInstance),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const amqp = require("amqplib") as { connect: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pubsub = require("@google-cloud/pubsub") as { PubSub: jest.Mock };

// ─── Imports ──────────────────────────────────────────────────────────────────

import { EventsPublisher } from "./events.publisher.js";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EventsPublisher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MESSAGE_BROKER_TYPE;
    delete process.env.MESSAGE_BROKER_URL;
    delete process.env.PUBSUB_PROJECT_ID;
    // Default amqp success behavior
    amqp.connect.mockResolvedValue(mockConnection);
    mockConnection.createChannel.mockResolvedValue(mockChannel);
    mockChannel.assertExchange.mockResolvedValue({});
  });

  // ─── onModuleInit ─────────────────────────────────────────────────────────

  describe("onModuleInit (RabbitMQ)", () => {
    it("connects to RabbitMQ by default and asserts the exchange", async () => {
      const publisher = new EventsPublisher();

      await publisher.onModuleInit();

      expect(amqp.connect).toHaveBeenCalledWith("amqp://localhost:5672");
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        "travelhub",
        "topic",
        { durable: true },
      );
    });

    it("uses MESSAGE_BROKER_URL when provided", async () => {
      process.env.MESSAGE_BROKER_URL = "amqp://rabbit.internal:5672";
      const publisher = new EventsPublisher();

      await publisher.onModuleInit();

      expect(amqp.connect).toHaveBeenCalledWith("amqp://rabbit.internal:5672");
    });

    it("logs a warning when RabbitMQ connection fails", async () => {
      amqp.connect.mockRejectedValueOnce(new Error("ECONNREFUSED"));
      const publisher = new EventsPublisher();
      const warnSpy = jest.spyOn((publisher as any).logger, "warn");

      await publisher.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("ECONNREFUSED"),
      );
    });

    it("logs a warning with String(err) when RabbitMQ throws a non-Error", async () => {
      amqp.connect.mockRejectedValueOnce("string-failure");
      const publisher = new EventsPublisher();
      const warnSpy = jest.spyOn((publisher as any).logger, "warn");

      await publisher.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("string-failure"),
      );
    });
  });

  describe("onModuleInit (Pub/Sub)", () => {
    it("instantiates PubSub client when MESSAGE_BROKER_TYPE=pubsub", async () => {
      process.env.MESSAGE_BROKER_TYPE = "pubsub";
      process.env.PUBSUB_PROJECT_ID = "test-project";
      const publisher = new EventsPublisher();

      await publisher.onModuleInit();

      expect(pubsub.PubSub).toHaveBeenCalledWith({ projectId: "test-project" });
    });

    it("does not call amqp.connect when MESSAGE_BROKER_TYPE=pubsub", async () => {
      process.env.MESSAGE_BROKER_TYPE = "pubsub";
      const publisher = new EventsPublisher();

      await publisher.onModuleInit();

      expect(amqp.connect).not.toHaveBeenCalled();
    });

    it("logs a warning when PubSub init throws", async () => {
      process.env.MESSAGE_BROKER_TYPE = "pubsub";
      pubsub.PubSub.mockImplementationOnce(() => {
        throw new Error("auth failed");
      });
      const publisher = new EventsPublisher();
      const warnSpy = jest.spyOn((publisher as any).logger, "warn");

      await publisher.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("auth failed"),
      );
    });

    it("logs a warning with String(err) when PubSub init throws non-Error", async () => {
      process.env.MESSAGE_BROKER_TYPE = "pubsub";
      pubsub.PubSub.mockImplementationOnce(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "string-init-error";
      });
      const publisher = new EventsPublisher();
      const warnSpy = jest.spyOn((publisher as any).logger, "warn");

      await publisher.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("string-init-error"),
      );
    });
  });

  // ─── publish ──────────────────────────────────────────────────────────────

  describe("publish (RabbitMQ)", () => {
    it("publishes via channel.publish with persistent=true", async () => {
      const publisher = new EventsPublisher();
      await publisher.onModuleInit();
      mockChannel.publish.mockClear();

      publisher.publish("inventory.room.upserted", { hello: "world" });

      expect(mockChannel.publish).toHaveBeenCalledWith(
        "travelhub",
        "inventory.room.upserted",
        expect.any(Buffer),
        { persistent: true },
      );
      const buf = mockChannel.publish.mock.calls[0][2] as Buffer;
      expect(JSON.parse(buf.toString())).toEqual({ hello: "world" });
    });

    it("is a no-op when the channel never connected", () => {
      const publisher = new EventsPublisher();
      // No onModuleInit() — channel stays null

      expect(() =>
        publisher.publish("inventory.room.upserted", {}),
      ).not.toThrow();
      expect(mockChannel.publish).not.toHaveBeenCalled();
    });
  });

  describe("publish (Pub/Sub)", () => {
    it("publishes via PubSub topic with the routing key transformed to dashes", async () => {
      process.env.MESSAGE_BROKER_TYPE = "pubsub";
      const publisher = new EventsPublisher();
      await publisher.onModuleInit();
      mockPubSubInstance.topic.mockClear();
      mockTopic.publishMessage.mockClear();

      publisher.publish("inventory.room.upserted", { foo: "bar" });

      // Give the void Promise time to settle
      await new Promise((r) => setTimeout(r, 10));

      expect(mockPubSubInstance.topic).toHaveBeenCalledWith(
        "inventory-room-upserted",
      );
      expect(mockTopic.publishMessage).toHaveBeenCalledWith({
        data: expect.any(Buffer),
      });
    });

    it("is a no-op when the PubSub client failed to initialize", async () => {
      process.env.MESSAGE_BROKER_TYPE = "pubsub";
      pubsub.PubSub.mockImplementationOnce(() => {
        throw new Error("init failed");
      });
      const publisher = new EventsPublisher();
      await publisher.onModuleInit();
      mockTopic.publishMessage.mockClear();

      publisher.publish("inventory.room.upserted", {});

      await new Promise((r) => setTimeout(r, 10));
      expect(mockTopic.publishMessage).not.toHaveBeenCalled();
    });

    it("logs an error when topic.publishMessage rejects", async () => {
      process.env.MESSAGE_BROKER_TYPE = "pubsub";
      const publisher = new EventsPublisher();
      await publisher.onModuleInit();
      const errorSpy = jest.spyOn((publisher as any).logger, "error");
      mockTopic.publishMessage.mockRejectedValueOnce(new Error("topic down"));

      publisher.publish("inventory.room.upserted", {});

      await new Promise((r) => setTimeout(r, 10));
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("topic down"),
      );
    });
  });

  // ─── onModuleDestroy ──────────────────────────────────────────────────────

  describe("onModuleDestroy", () => {
    it("resolves when no broker is connected", async () => {
      const publisher = new EventsPublisher();
      await expect(publisher.onModuleDestroy()).resolves.not.toThrow();
    });

    it("closes RabbitMQ channel and connection", async () => {
      const publisher = new EventsPublisher();
      await publisher.onModuleInit();

      await publisher.onModuleDestroy();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it("closes the Pub/Sub client", async () => {
      process.env.MESSAGE_BROKER_TYPE = "pubsub";
      const publisher = new EventsPublisher();
      await publisher.onModuleInit();

      await publisher.onModuleDestroy();

      expect(mockPubSubInstance.close).toHaveBeenCalled();
    });

    it("suppresses errors raised during shutdown", async () => {
      const publisher = new EventsPublisher();
      await publisher.onModuleInit();
      mockChannel.close.mockRejectedValueOnce(new Error("already closed"));

      await expect(publisher.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});
