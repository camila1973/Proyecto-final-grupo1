import { EventsService } from "./events.service.js";
import type { RoomUpsertedHandler } from "./handlers/room-upserted.handler.js";
import type { AvailabilityUpdatedHandler } from "./handlers/availability-updated.handler.js";
import type { RoomDeletedHandler } from "./handlers/room-deleted.handler.js";
import type { TaxRuleUpsertedHandler } from "./handlers/tax-rule-upserted.handler.js";
import type { TaxRuleDeletedHandler } from "./handlers/tax-rule-deleted.handler.js";
import type { PartnerFeeUpsertedHandler } from "./handlers/partner-fee-upserted.handler.js";
import type { PartnerFeeDeletedHandler } from "./handlers/partner-fee-deleted.handler.js";

// ─── amqplib mock ─────────────────────────────────────────────────────────────
// jest.mock is hoisted before variable declarations, so define mocks inside the factory
// and expose them via module properties for test access.

jest.mock("amqplib", () => {
  const ch = {
    assertExchange: jest.fn().mockResolvedValue({}),
    assertQueue: jest.fn().mockResolvedValue({}),
    bindQueue: jest.fn().mockResolvedValue({}),
    consume: jest.fn().mockResolvedValue({}),
    ack: jest.fn(),
    nack: jest.fn(),
    close: jest.fn().mockResolvedValue({}),
  };
  const conn = {
    createChannel: jest.fn().mockResolvedValue(ch),
    close: jest.fn().mockResolvedValue({}),
  };
  return {
    connect: jest.fn().mockResolvedValue(conn),
    __mockChannel: ch,
    __mockConnection: conn,
  };
});

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
        };
        subs.set(name, sub);
      }
      return subs.get(name);
    }
  }
  return { PubSub, __subs: subs };
});

import * as amqpMod from "amqplib";
const mockChannel = (amqpMod as any).__mockChannel as {
  assertExchange: jest.Mock;
  assertQueue: jest.Mock;
  bindQueue: jest.Mock;
  consume: jest.Mock;
  ack: jest.Mock;
  nack: jest.Mock;
  close: jest.Mock;
};
const mockConnection = (amqpMod as any).__mockConnection as {
  createChannel: jest.Mock;
  close: jest.Mock;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeHandlers() {
  const roomUpserted = {
    handle: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<RoomUpsertedHandler>;

  const availabilityUpdated = {
    handle: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AvailabilityUpdatedHandler>;

  const roomDeleted = {
    handle: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<RoomDeletedHandler>;

  const taxRuleUpserted = {
    handle: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<TaxRuleUpsertedHandler>;

  const taxRuleDeleted = {
    handle: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<TaxRuleDeletedHandler>;

  const partnerFeeUpserted = {
    handle: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<PartnerFeeUpsertedHandler>;

  const partnerFeeDeleted = {
    handle: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<PartnerFeeDeletedHandler>;

  return {
    roomUpserted,
    availabilityUpdated,
    roomDeleted,
    taxRuleUpserted,
    taxRuleDeleted,
    partnerFeeUpserted,
    partnerFeeDeleted,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("EventsService", () => {
  let service: EventsService;
  let handlers: ReturnType<typeof makeHandlers>;

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pubSub = require("@google-cloud/pubsub") as {
      __subs: Map<string, unknown>;
    };
    pubSub.__subs.clear();
    // Reset all mock implementations that may have changed
    mockChannel.ack.mockReset();
    mockChannel.nack.mockReset();
    handlers = makeHandlers();
    service = new EventsService(
      handlers.roomUpserted,
      handlers.availabilityUpdated,
      handlers.roomDeleted,
      handlers.taxRuleUpserted,
      handlers.taxRuleDeleted,
      handlers.partnerFeeUpserted,
      handlers.partnerFeeDeleted,
    );
  });

  describe("onModuleInit", () => {
    it("connects to RabbitMQ when MESSAGE_BROKER_TYPE is rabbitmq", async () => {
      process.env.MESSAGE_BROKER_TYPE = "rabbitmq";
      const amqp = await import("amqplib");

      await service.onModuleInit();

      expect(amqp.connect).toHaveBeenCalled();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        "travelhub",
        "topic",
        {
          durable: true,
        },
      );
    });

    it("skips connection when MESSAGE_BROKER_TYPE is not rabbitmq", async () => {
      process.env.MESSAGE_BROKER_TYPE = "kafka";
      const amqp = await import("amqplib");

      await service.onModuleInit();

      expect(amqp.connect).not.toHaveBeenCalled();
      delete process.env.MESSAGE_BROKER_TYPE;
    });

    it("subscribes to exactly seven queues", async () => {
      process.env.MESSAGE_BROKER_TYPE = "rabbitmq";
      await service.onModuleInit();

      expect(mockChannel.assertQueue).toHaveBeenCalledTimes(7);
      expect(mockChannel.bindQueue).toHaveBeenCalledTimes(7);
      expect(mockChannel.consume).toHaveBeenCalledTimes(7);
    });

    it("binds to the correct routing keys", async () => {
      process.env.MESSAGE_BROKER_TYPE = "rabbitmq";
      await service.onModuleInit();

      const routingKeys = mockChannel.bindQueue.mock.calls.map(
        ([, , rk]: [string, string, string]) => rk,
      );
      expect(routingKeys).toContain("inventory.room.upserted");
      expect(routingKeys).toContain("inventory.price.updated");
      expect(routingKeys).toContain("inventory.room.deleted");
      expect(routingKeys).toContain("tax.rule.upserted");
      expect(routingKeys).toContain("tax.rule.deleted");
      expect(routingKeys).toContain("partner.fee.upserted");
      expect(routingKeys).toContain("partner.fee.deleted");
    });

    it("connects to Pub/Sub and registers expected subscriptions", async () => {
      process.env.MESSAGE_BROKER_TYPE = "pubsub";

      await service.onModuleInit();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pubSub = require("@google-cloud/pubsub") as {
        __subs: Map<string, unknown>;
      };
      expect(pubSub.__subs.has("search-inventory-room-upserted")).toBe(true);
      expect(pubSub.__subs.has("search-inventory-price-updated")).toBe(true);
      expect(pubSub.__subs.has("search-inventory-room-deleted")).toBe(true);
      expect(pubSub.__subs.has("search-tax-rule-upserted")).toBe(true);
      expect(pubSub.__subs.has("search-tax-rule-deleted")).toBe(true);
      expect(pubSub.__subs.has("search-partner-fee-upserted")).toBe(true);
      expect(pubSub.__subs.has("search-partner-fee-deleted")).toBe(true);
    });
  });

  describe("Pub/Sub dispatch", () => {
    it("acks Pub/Sub message when handler succeeds", async () => {
      process.env.MESSAGE_BROKER_TYPE = "pubsub";

      await service.onModuleInit();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pubSub = require("@google-cloud/pubsub") as {
        __subs: Map<string, any>;
      };
      const sub = pubSub.__subs.get("search-inventory-price-updated");

      const message = {
        data: Buffer.from(JSON.stringify({ roomId: "r1", pricePeriods: [] })),
        ack: jest.fn(),
        nack: jest.fn(),
      };

      sub.__emitMessage(message);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(handlers.availabilityUpdated.handle).toHaveBeenCalled();
      expect(message.ack).toHaveBeenCalled();
      expect(message.nack).not.toHaveBeenCalled();
    });

    it("nacks Pub/Sub message when payload is invalid JSON", async () => {
      process.env.MESSAGE_BROKER_TYPE = "pubsub";

      await service.onModuleInit();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pubSub = require("@google-cloud/pubsub") as {
        __subs: Map<string, any>;
      };
      const sub = pubSub.__subs.get("search-inventory-price-updated");

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

  describe("onModuleDestroy", () => {
    it("closes channel and connection", async () => {
      process.env.MESSAGE_BROKER_TYPE = "rabbitmq";
      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it("does not throw when called before init", async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe("RabbitMQ connection failure", () => {
    it("logs error and does not throw when amqp.connect rejects", async () => {
      process.env.MESSAGE_BROKER_TYPE = "rabbitmq";
      (amqpMod.connect as jest.Mock).mockRejectedValueOnce(
        new Error("ECONNREFUSED"),
      );

      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe("dispatch (message handling)", () => {
    beforeEach(async () => {
      process.env.MESSAGE_BROKER_TYPE = "rabbitmq";
      await service.onModuleInit();
    });

    const getConsumeCallback = (callIndex: number) =>
      mockChannel.consume.mock.calls[callIndex][1] as (msg: any) => void;

    it("acks message after successful room.upserted handler", async () => {
      const cb = getConsumeCallback(0);
      const msg = {
        content: Buffer.from(JSON.stringify({ snapshot: { roomId: "r1" } })),
      };
      cb(msg);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it("dispatches to availability handler (covers queue callback)", async () => {
      const cb = getConsumeCallback(1);
      const msg = {
        content: Buffer.from(
          JSON.stringify({ roomId: "r1", pricePeriods: [] }),
        ),
      };
      cb(msg);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(handlers.availabilityUpdated.handle).toHaveBeenCalled();
    });

    it("dispatches to room.deleted handler (covers queue callback)", async () => {
      const cb = getConsumeCallback(2);
      const msg = {
        content: Buffer.from(
          JSON.stringify({ roomId: "r1", propertyId: "p1" }),
        ),
      };
      cb(msg);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(handlers.roomDeleted.handle).toHaveBeenCalled();
    });

    it("nacks message with requeue=true when handler throws", async () => {
      handlers.roomUpserted.handle.mockRejectedValue(
        new Error("handler error"),
      );
      const cb = getConsumeCallback(0);
      const msg = { content: Buffer.from(JSON.stringify({ room_id: "r1" })) };
      cb(msg);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, true);
    });

    it("nacks message with requeue=false when JSON is invalid", () => {
      const cb = getConsumeCallback(0);
      const msg = { content: Buffer.from("not valid json }{") };
      cb(msg);
      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, false);
    });

    it("does nothing when msg is null", () => {
      const cb = getConsumeCallback(0);
      expect(() => cb(null)).not.toThrow();
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });
  });
});
