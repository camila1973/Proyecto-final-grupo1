// ─── amqplib mock ─────────────────────────────────────────────────────────────
// Must be at top level so jest.mock hoisting picks it up before imports.

const mockChannel = {
  assertExchange: jest.fn().mockResolvedValue({}),
  assertQueue: jest.fn().mockResolvedValue({}),
  bindQueue: jest.fn().mockResolvedValue({}),
  consume: jest.fn().mockResolvedValue({}),
  ack: jest.fn(),
  nack: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockConnection = {
  createChannel: jest.fn().mockResolvedValue(mockChannel),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock("amqplib", () => ({
  connect: jest.fn().mockResolvedValue(mockConnection),
}));

jest.mock("@google-cloud/pubsub", () => {
  const subs = new Map<string, any>();
  class PubSub {
    subscription(name: string) {
      if (!subs.has(name)) {
        const handlers: Record<string, (arg: any) => void> = {};
        const sub = {
          on: jest.fn((event: string, cb: (arg: any) => void) => {
            handlers[event] = cb;
            return sub;
          }),
          removeAllListeners: jest.fn(),
          close: jest.fn().mockResolvedValue(undefined),
          __emitMessage: (msg: any) => handlers.message?.(msg),
          __emitError: (err: unknown) => handlers.error?.(err),
        };
        subs.set(name, sub);
      }
      return subs.get(name);
    }
  }
  return { PubSub, __subs: subs };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const amqp = require("amqplib") as { connect: jest.Mock };

// ─── Imports ──────────────────────────────────────────────────────────────────

import { EventsService } from "./events.service.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePriceCache() {
  return { replaceForRoom: jest.fn().mockResolvedValue(undefined) };
}

function makeRoomLocationCache() {
  return { upsert: jest.fn().mockResolvedValue(undefined) };
}

function makePartnerFees() {
  return {
    upsertFromEvent: jest.fn().mockResolvedValue(undefined),
    softDelete: jest.fn().mockResolvedValue(undefined),
  };
}

function makeService() {
  const priceCache = makePriceCache();
  const roomLocationCache = makeRoomLocationCache();
  const partnerFees = makePartnerFees();
  const service = new EventsService(
    priceCache as any,
    roomLocationCache as any,
    partnerFees as any,
  );
  return { service, priceCache, roomLocationCache, partnerFees };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EventsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MESSAGE_BROKER_TYPE;
    delete process.env.MESSAGE_BROKER_URL;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pubSub = require("@google-cloud/pubsub") as {
      __subs: Map<string, unknown>;
    };
    pubSub.__subs.clear();
  });

  // ─── handlePriceUpdated ───────────────────────────────────────────────────

  describe("handlePriceUpdated", () => {
    it("delegates to priceCache.replaceForRoom", async () => {
      const { service, priceCache } = makeService();
      const payload = {
        roomId: "room-1",
        pricePeriods: [
          { fromDate: "2026-01-01", toDate: "2026-12-31", priceUsd: 150 },
        ],
      };

      await service.handlePriceUpdated(payload);

      expect(priceCache.replaceForRoom).toHaveBeenCalledWith(
        "room-1",
        payload.pricePeriods,
      );
    });
  });

  // ─── handleRoomUpserted ───────────────────────────────────────────────────

  describe("handleRoomUpserted", () => {
    it("delegates to roomLocationCache.upsert with country/city", async () => {
      const { service, roomLocationCache } = makeService();
      const snapshot = {
        roomId: "room-1",
        propertyId: "prop-1",
        country: "MX",
        city: "Cancún",
      };

      await service.handleRoomUpserted(snapshot);

      expect(roomLocationCache.upsert).toHaveBeenCalledWith(
        "room-1",
        "prop-1",
        {
          country: "MX",
          city: "Cancún",
        },
      );
    });
  });

  // ─── onModuleInit ─────────────────────────────────────────────────────────

  describe("onModuleInit", () => {
    it("warns and skips when MESSAGE_BROKER_TYPE is unsupported", async () => {
      const { service } = makeService();
      const warnSpy = jest.spyOn((service as any).logger, "warn");
      process.env.MESSAGE_BROKER_TYPE = "kafka";

      await service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("kafka"));
    });

    it("connects to RabbitMQ when MESSAGE_BROKER_TYPE=rabbitmq", async () => {
      const { service } = makeService();
      process.env.MESSAGE_BROKER_TYPE = "rabbitmq";

      await service.onModuleInit();

      expect(amqp.connect).toHaveBeenCalled();
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        "travelhub",
        "topic",
        { durable: true },
      );
    });

    it("logs error when RabbitMQ connection fails", async () => {
      const { service } = makeService();
      amqp.connect.mockRejectedValueOnce(new Error("ECONNREFUSED"));
      const errorSpy = jest.spyOn((service as any).logger, "error");
      process.env.MESSAGE_BROKER_TYPE = "rabbitmq";

      await service.onModuleInit();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("ECONNREFUSED"),
      );
    });

    it("subscribes to all queues when using RabbitMQ", async () => {
      const { service } = makeService();
      process.env.MESSAGE_BROKER_TYPE = "rabbitmq";

      await service.onModuleInit();

      // assertQueue should be called once per subscription (4 total)
      expect(mockChannel.assertQueue).toHaveBeenCalledTimes(4);
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        "booking.inventory.price.updated",
        { durable: true },
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        "booking.inventory.room.upserted",
        { durable: true },
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        "booking.partner.fee.upserted",
        { durable: true },
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        "booking.partner.fee.deleted",
        { durable: true },
      );
    });

    it("connects to Pub/Sub and registers expected subscriptions", async () => {
      const { service } = makeService();
      process.env.MESSAGE_BROKER_TYPE = "pubsub";

      await service.onModuleInit();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pubSub = require("@google-cloud/pubsub") as {
        __subs: Map<string, unknown>;
      };
      expect(pubSub.__subs.has("booking-inventory-price-updated")).toBe(true);
      expect(pubSub.__subs.has("booking-inventory-room-upserted")).toBe(true);
      expect(pubSub.__subs.has("booking-partner-fee-upserted")).toBe(true);
      expect(pubSub.__subs.has("booking-partner-fee-deleted")).toBe(true);
    });
  });

  describe("Pub/Sub message dispatch", () => {
    it("acks Pub/Sub message when handler succeeds", async () => {
      const { service, priceCache } = makeService();
      process.env.MESSAGE_BROKER_TYPE = "pubsub";

      await service.onModuleInit();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pubSub = require("@google-cloud/pubsub") as {
        __subs: Map<string, any>;
      };
      const sub = pubSub.__subs.get("booking-inventory-price-updated");

      const message = {
        data: Buffer.from(
          JSON.stringify({ roomId: "room-1", pricePeriods: [] }),
        ),
        ack: jest.fn(),
        nack: jest.fn(),
      };

      sub.__emitMessage(message);
      await new Promise((r) => setTimeout(r, 10));

      expect(priceCache.replaceForRoom).toHaveBeenCalledWith("room-1", []);
      expect(message.ack).toHaveBeenCalled();
      expect(message.nack).not.toHaveBeenCalled();
    });

    it("nacks Pub/Sub message on invalid JSON", async () => {
      const { service } = makeService();
      process.env.MESSAGE_BROKER_TYPE = "pubsub";

      await service.onModuleInit();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pubSub = require("@google-cloud/pubsub") as {
        __subs: Map<string, any>;
      };
      const sub = pubSub.__subs.get("booking-inventory-price-updated");

      const message = {
        data: Buffer.from("not-json"),
        ack: jest.fn(),
        nack: jest.fn(),
      };

      sub.__emitMessage(message);

      expect(message.ack).not.toHaveBeenCalled();
      expect(message.nack).toHaveBeenCalled();
    });
  });

  // ─── onModuleDestroy ──────────────────────────────────────────────────────

  describe("onModuleDestroy", () => {
    it("completes without error when connections are null", async () => {
      const { service } = makeService();
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });

    it("closes channel and connection", async () => {
      const { service } = makeService();
      const channel = { close: jest.fn().mockResolvedValue(undefined) };
      const connection = { close: jest.fn().mockResolvedValue(undefined) };
      (service as any).channel = channel;
      (service as any).connection = connection;

      await service.onModuleDestroy();

      expect(channel.close).toHaveBeenCalled();
      expect(connection.close).toHaveBeenCalled();
    });

    it("closes Pub/Sub subscriptions", async () => {
      const { service } = makeService();
      const sub = {
        removeAllListeners: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };
      (service as any).pubSubSubscriptions = [sub];

      await service.onModuleDestroy();

      expect(sub.removeAllListeners).toHaveBeenCalled();
      expect(sub.close).toHaveBeenCalled();
    });

    it("suppresses errors during shutdown", async () => {
      const { service } = makeService();
      (service as any).channel = {
        close: jest.fn().mockRejectedValue(new Error("already closed")),
      };

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  // ─── dispatchRabbitMQ ─────────────────────────────────────────────────────

  describe("dispatchRabbitMQ (private)", () => {
    it("parses JSON and acks on handler success", async () => {
      const { service } = makeService();
      const channel = { ack: jest.fn(), nack: jest.fn() };
      (service as any).channel = channel;

      const handler = jest.fn().mockResolvedValue(undefined);
      const msg = { content: Buffer.from(JSON.stringify({ roomId: "r1" })) };

      (service as any).dispatchRabbitMQ(msg, handler);
      await new Promise((r) => setTimeout(r, 10));

      expect(handler).toHaveBeenCalledWith({ roomId: "r1" });
      expect(channel.ack).toHaveBeenCalledWith(msg);
    });

    it("nacks with requeue=true on handler error", async () => {
      const { service } = makeService();
      const channel = { ack: jest.fn(), nack: jest.fn() };
      (service as any).channel = channel;

      const handler = jest.fn().mockRejectedValue(new Error("handler failed"));
      const msg = { content: Buffer.from(JSON.stringify({})) };

      (service as any).dispatchRabbitMQ(msg, handler);
      await new Promise((r) => setTimeout(r, 10));

      expect(channel.nack).toHaveBeenCalledWith(msg, false, true);
    });

    it("nacks with requeue=false and logs on invalid JSON", async () => {
      const { service } = makeService();
      const channel = { ack: jest.fn(), nack: jest.fn() };
      (service as any).channel = channel;
      const errorSpy = jest.spyOn((service as any).logger, "error");

      const handler = jest.fn();
      const msg = { content: Buffer.from("not-json") };

      (service as any).dispatchRabbitMQ(msg, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
