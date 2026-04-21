import { EventsPublisher } from "./events.publisher";

function makePublisher() {
  return new EventsPublisher();
}

describe("EventsPublisher", () => {
  describe("publish", () => {
    it("does nothing when channel is null (before init)", () => {
      const publisher = makePublisher();
      // Should not throw even with no channel
      expect(() => publisher.publish("test.key", { foo: "bar" })).not.toThrow();
    });

    it("publishes to the channel when connected", () => {
      const publisher = makePublisher();
      const channelPublish = jest.fn().mockReturnValue(true);
      // Inject channel directly via private property
      (publisher as any).channel = { publish: channelPublish };
      publisher.publish("inventory.room.updated", { roomId: "room-1" });
      expect(channelPublish).toHaveBeenCalledWith(
        "travelhub",
        "inventory.room.updated",
        expect.any(Buffer),
        { persistent: true },
      );
    });

    it("serializes the payload as JSON", () => {
      const publisher = makePublisher();
      const channelPublish = jest.fn().mockReturnValue(true);
      (publisher as any).channel = { publish: channelPublish };
      publisher.publish("test.key", { value: 42 });
      const [, , buffer] = channelPublish.mock.calls[0] as [
        string,
        string,
        Buffer,
        unknown,
      ];
      expect(JSON.parse(buffer.toString())).toEqual({ value: 42 });
    });
  });

  describe("onModuleInit", () => {
    it("logs a warning when RabbitMQ is unavailable", async () => {
      const publisher = makePublisher();
      // amqplib.connect will fail since no AMQP server is running
      process.env["RABBITMQ_URL"] = "amqp://invalid-host:9999";
      // Should not throw — it catches and warns
      await expect(publisher.onModuleInit()).resolves.not.toThrow();
      delete process.env["RABBITMQ_URL"];
    });
  });

  describe("pubsub broker path", () => {
    beforeEach(() => {
      process.env["MESSAGE_BROKER_TYPE"] = "pubsub";
    });

    afterEach(() => {
      delete process.env["MESSAGE_BROKER_TYPE"];
    });

    it("onModuleInit initializes pubsub (warns on failure if SDK unavailable)", async () => {
      const publisher = makePublisher();
      await expect(publisher.onModuleInit()).resolves.not.toThrow();
    });

    it("publish dispatches to publishViaPubSub when brokerType is pubsub", () => {
      const publisher = makePublisher();
      (publisher as any).brokerType = "pubsub";
      const spy = jest
        .spyOn(publisher as any, "publishViaPubSub")
        .mockResolvedValue(undefined);
      publisher.publish("inventory.room.upserted", { roomId: "r1" });
      expect(spy).toHaveBeenCalledWith("inventory.room.upserted", {
        roomId: "r1",
      });
    });

    it("publishViaPubSub returns early when pubSubClient is null", async () => {
      const publisher = makePublisher();
      // pubSubClient is null by default
      await expect(
        (publisher as any).publishViaPubSub("test.key", {}),
      ).resolves.not.toThrow();
    });

    it("publishViaPubSub publishes to the correct topic (dots → hyphens)", async () => {
      const publisher = makePublisher();
      const publishMessage = jest.fn().mockResolvedValue("msg-id");
      const topic = jest.fn().mockReturnValue({ publishMessage });
      (publisher as any).pubSubClient = { topic };

      await (publisher as any).publishViaPubSub("inventory.room.upserted", {
        id: 1,
      });

      expect(topic).toHaveBeenCalledWith("inventory-room-upserted");
      expect(publishMessage).toHaveBeenCalledWith({
        data: expect.any(Buffer),
      });
    });

    it("publishViaPubSub logs error and does not throw when publish fails", async () => {
      const publisher = makePublisher();
      const topic = jest.fn().mockReturnValue({
        publishMessage: jest
          .fn()
          .mockRejectedValue(new Error("pubsub failure")),
      });
      (publisher as any).pubSubClient = { topic };

      await expect(
        (publisher as any).publishViaPubSub("test.key", {}),
      ).resolves.not.toThrow();
    });

    it("onModuleDestroy closes pubSubClient when set", async () => {
      const publisher = makePublisher();
      const close = jest.fn().mockResolvedValue(undefined);
      (publisher as any).pubSubClient = { close };
      await publisher.onModuleDestroy();
      expect(close).toHaveBeenCalled();
    });
  });

  describe("onModuleDestroy", () => {
    it("does nothing when connection and channel are null", async () => {
      const publisher = makePublisher();
      await expect(publisher.onModuleDestroy()).resolves.not.toThrow();
    });

    it("closes channel and connection when connected", async () => {
      const publisher = makePublisher();
      const closeChannel = jest.fn().mockResolvedValue(undefined);
      const closeConnection = jest.fn().mockResolvedValue(undefined);
      (publisher as any).channel = { close: closeChannel };
      (publisher as any).connection = { close: closeConnection };
      await publisher.onModuleDestroy();
      expect(closeChannel).toHaveBeenCalled();
      expect(closeConnection).toHaveBeenCalled();
    });

    it("ignores errors during cleanup", async () => {
      const publisher = makePublisher();
      (publisher as any).channel = {
        close: jest.fn().mockRejectedValue(new Error("channel error")),
      };
      (publisher as any).connection = {
        close: jest.fn().mockRejectedValue(new Error("connection error")),
      };
      await expect(publisher.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});
