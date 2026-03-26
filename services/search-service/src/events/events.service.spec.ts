import { EventsService } from "./events.service.js";
import type { RoomUpsertedHandler } from "./handlers/room-upserted.handler.js";
import type { AvailabilityUpdatedHandler } from "./handlers/availability-updated.handler.js";
import type { TaxonomyUpdatedHandler } from "./handlers/taxonomy-updated.handler.js";

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

  const taxonomyUpdated = {
    handle: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<TaxonomyUpdatedHandler>;

  return { roomUpserted, availabilityUpdated, taxonomyUpdated };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("EventsService", () => {
  let service: EventsService;
  let handlers: ReturnType<typeof makeHandlers>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock implementations that may have changed
    mockChannel.ack.mockReset();
    mockChannel.nack.mockReset();
    handlers = makeHandlers();
    service = new EventsService(
      handlers.roomUpserted,
      handlers.availabilityUpdated,
      handlers.taxonomyUpdated,
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

    it("subscribes to exactly three queues", async () => {
      process.env.MESSAGE_BROKER_TYPE = "rabbitmq";
      await service.onModuleInit();

      expect(mockChannel.assertQueue).toHaveBeenCalledTimes(3);
      expect(mockChannel.bindQueue).toHaveBeenCalledTimes(3);
      expect(mockChannel.consume).toHaveBeenCalledTimes(3);
    });

    it("binds to the correct routing keys", async () => {
      process.env.MESSAGE_BROKER_TYPE = "rabbitmq";
      await service.onModuleInit();

      const routingKeys = mockChannel.bindQueue.mock.calls.map(
        ([, , rk]: [string, string, string]) => rk,
      );
      expect(routingKeys).toContain("inventory.room.upserted");
      expect(routingKeys).toContain("inventory.availability.updated");
      expect(routingKeys).toContain("taxonomy.updated");
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
      const msg = { content: Buffer.from(JSON.stringify({ room_id: "r1" })) };
      cb(msg);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it("dispatches to availability handler (covers queue callback)", async () => {
      const cb = getConsumeCallback(1);
      const msg = {
        content: Buffer.from(JSON.stringify({ room_id: "r1", ranges: [] })),
      };
      cb(msg);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(handlers.availabilityUpdated.handle).toHaveBeenCalled();
    });

    it("dispatches to taxonomy handler (covers queue callback)", async () => {
      const cb = getConsumeCallback(2);
      const msg = { content: Buffer.from(JSON.stringify({})) };
      cb(msg);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(handlers.taxonomyUpdated.handle).toHaveBeenCalled();
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
