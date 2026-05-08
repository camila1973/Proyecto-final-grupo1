import { EventsService } from "./events.service.js";
import type { BookingEvent } from "./types.js";
import * as amqp from "amqplib";

jest.mock("amqplib");

jest.mock("@google-cloud/pubsub", () => ({
  PubSub: jest.fn(),
}));

function makeEvent(overrides: Partial<BookingEvent> = {}): BookingEvent {
  return {
    routingKey: "booking.cancelled",
    reservationId: "res-1",
    partnerId: "partner-1",
    propertyId: "prop-1",
    roomId: "room-1",
    bookerId: "booker-1",
    guestInfo: {
      firstName: "Ana",
      lastName: "García",
      email: "ana@example.com",
    },
    checkIn: "2026-05-01",
    checkOut: "2026-05-04",
    actor: "partner",
    reason: "overbooking",
    timestamp: "2026-05-07T00:00:00Z",
    ...overrides,
  };
}

function makeChannel() {
  return {
    assertExchange: jest.fn().mockResolvedValue(undefined),
    assertQueue: jest.fn().mockResolvedValue(undefined),
    bindQueue: jest.fn().mockResolvedValue(undefined),
    consume: jest.fn().mockResolvedValue(undefined),
    ack: jest.fn(),
    nack: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

function makeConnection(channel: ReturnType<typeof makeChannel>) {
  return {
    createChannel: jest.fn().mockResolvedValue(channel),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

// ─── handle ─────────────────────────────────────────────────────────────────

describe("EventsService.handle", () => {
  let app: { sendNotification: jest.Mock };
  let service: EventsService;

  beforeEach(() => {
    app = { sendNotification: jest.fn() };
    service = new EventsService(app as any);
  });

  it("forwards a rendered partner-cancel message to AppService", async () => {
    await service.handle("booking.cancelled", makeEvent());

    expect(app.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "booker-1",
        to: "ana@example.com",
        channel: "email",
        subject: "Reserva cancelada",
        message: expect.stringContaining("overbooking"),
      }),
    );
  });

  it("does nothing when template returns null (guest cancel)", async () => {
    await service.handle("booking.cancelled", makeEvent({ actor: "guest" }));

    expect(app.sendNotification).not.toHaveBeenCalled();
  });

  it("does nothing for routing keys with silent templates (failed)", async () => {
    await service.handle(
      "booking.failed",
      makeEvent({ routingKey: "booking.failed", actor: "system" }),
    );

    expect(app.sendNotification).not.toHaveBeenCalled();
  });

  it("forwards confirmed event for partner actor", async () => {
    await service.handle(
      "booking.confirmed",
      makeEvent({ routingKey: "booking.confirmed", actor: "partner" }),
    );

    expect(app.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Reserva confirmada",
        message: expect.stringContaining("por el hotel"),
      }),
    );
  });
});

// ─── onModuleInit ─────────────────────────────────────────────────────────────

describe("EventsService.onModuleInit", () => {
  let app: { sendNotification: jest.Mock };
  let service: EventsService;
  let channel: ReturnType<typeof makeChannel>;
  let connection: ReturnType<typeof makeConnection>;
  const originalEnv = process.env.MESSAGE_BROKER_TYPE;

  beforeEach(() => {
    jest.clearAllMocks();
    app = { sendNotification: jest.fn() };
    service = new EventsService(app as any);
    channel = makeChannel();
    connection = makeConnection(channel);
    (amqp.connect as jest.Mock).mockResolvedValue(connection);
  });

  afterEach(() => {
    process.env.MESSAGE_BROKER_TYPE = originalEnv;
  });

  it("connects to RabbitMQ when MESSAGE_BROKER_TYPE is rabbitmq", async () => {
    process.env.MESSAGE_BROKER_TYPE = "rabbitmq";

    await service.onModuleInit();

    expect(amqp.connect).toHaveBeenCalled();
    expect(channel.assertExchange).toHaveBeenCalledWith("travelhub", "topic", {
      durable: true,
    });
  });

  it("defaults to RabbitMQ when MESSAGE_BROKER_TYPE is not set", async () => {
    delete process.env.MESSAGE_BROKER_TYPE;

    await service.onModuleInit();

    expect(amqp.connect).toHaveBeenCalled();
  });

  it("logs a warning for unsupported broker types", async () => {
    process.env.MESSAGE_BROKER_TYPE = "kafka";
    const warnSpy = jest.spyOn((service as any).logger, "warn");

    await service.onModuleInit();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("kafka"));
    expect(amqp.connect).not.toHaveBeenCalled();
  });

  it("subscribes to all 6 booking routing keys", async () => {
    process.env.MESSAGE_BROKER_TYPE = "rabbitmq";

    await service.onModuleInit();

    expect(channel.assertQueue).toHaveBeenCalledTimes(6);
    expect(channel.bindQueue).toHaveBeenCalledTimes(6);
    expect(channel.consume).toHaveBeenCalledTimes(6);
  });

  it("logs error and does not throw when RabbitMQ connection fails", async () => {
    process.env.MESSAGE_BROKER_TYPE = "rabbitmq";
    (amqp.connect as jest.Mock).mockRejectedValue(new Error("ECONNREFUSED"));
    const errorSpy = jest.spyOn((service as any).logger, "error");

    await expect(service.onModuleInit()).resolves.not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("ECONNREFUSED"),
    );
  });

  it("connects to Pub/Sub when MESSAGE_BROKER_TYPE is pubsub", async () => {
    process.env.MESSAGE_BROKER_TYPE = "pubsub";
    const mockSubscription = {
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const { PubSub } = await import("@google-cloud/pubsub");
    (PubSub as unknown as jest.Mock).mockImplementation(() => ({
      subscription: jest.fn().mockReturnValue(mockSubscription),
    }));

    await service.onModuleInit();

    expect(mockSubscription.on).toHaveBeenCalledWith(
      "message",
      expect.any(Function),
    );
    expect(mockSubscription.on).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
  });
});

// ─── onModuleDestroy ─────────────────────────────────────────────────────────

describe("EventsService.onModuleDestroy", () => {
  let app: { sendNotification: jest.Mock };
  let service: EventsService;

  beforeEach(() => {
    app = { sendNotification: jest.fn() };
    service = new EventsService(app as any);
  });

  it("closes channel and connection", async () => {
    const channel = makeChannel();
    const connection = makeConnection(channel);
    (service as any).channel = channel;
    (service as any).connection = connection;

    await service.onModuleDestroy();

    expect(channel.close).toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalled();
  });

  it("closes pubsub subscriptions", async () => {
    const sub = {
      removeAllListeners: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    (service as any).pubSubSubscriptions = [sub];

    await service.onModuleDestroy();

    expect(sub.removeAllListeners).toHaveBeenCalled();
    expect(sub.close).toHaveBeenCalled();
  });

  it("does not throw when channel/connection are null", async () => {
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });

  it("does not throw when close fails", async () => {
    const channel = {
      close: jest.fn().mockRejectedValue(new Error("already closed")),
    };
    (service as any).channel = channel;

    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });
});

// ─── dispatchRabbitMQ ────────────────────────────────────────────────────────

describe("EventsService.dispatchRabbitMQ (private)", () => {
  let app: { sendNotification: jest.Mock };
  let service: EventsService;
  let channel: ReturnType<typeof makeChannel>;

  beforeEach(() => {
    app = { sendNotification: jest.fn() };
    service = new EventsService(app as any);
    channel = makeChannel();
    (service as any).channel = channel;
  });

  function makeMsg(content: string) {
    return { content: Buffer.from(content) } as amqp.Message;
  }

  it("parses message, calls handler, and acks on success", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const msg = makeMsg(JSON.stringify(makeEvent()));

    (service as any).dispatchRabbitMQ(msg, handler);
    await new Promise(process.nextTick);

    expect(handler).toHaveBeenCalledWith(makeEvent());
    expect(channel.ack).toHaveBeenCalledWith(msg);
  });

  it("nacks without requeue when JSON is invalid", () => {
    const handler = jest.fn();
    const msg = makeMsg("not-json{{{");
    const errorSpy = jest.spyOn((service as any).logger, "error");

    (service as any).dispatchRabbitMQ(msg, handler);

    expect(handler).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("nacks with requeue when handler throws", async () => {
    const handler = jest.fn().mockRejectedValue(new Error("handler failed"));
    const msg = makeMsg(JSON.stringify(makeEvent()));
    const errorSpy = jest.spyOn((service as any).logger, "error");

    (service as any).dispatchRabbitMQ(msg, handler);
    await new Promise(process.nextTick);

    expect(channel.nack).toHaveBeenCalledWith(msg, false, true);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("handler failed"),
    );
  });
});

// ─── connectPubSub message handler ───────────────────────────────────────────

describe("EventsService.connectPubSub (private)", () => {
  let app: { sendNotification: jest.Mock };
  let service: EventsService;

  beforeEach(() => {
    app = { sendNotification: jest.fn() };
    service = new EventsService(app as any);
  });

  function makePubSubMessage(data: string) {
    return {
      data: Buffer.from(data),
      ack: jest.fn(),
      nack: jest.fn(),
    };
  }

  it("acks message after handler resolves", async () => {
    const handlers: Record<string, Function> = {};
    const mockSub = {
      on: jest.fn((ev, fn) => {
        handlers[ev] = fn;
      }),
    };
    const { PubSub } = await import("@google-cloud/pubsub");
    (PubSub as unknown as jest.Mock).mockImplementation(() => ({
      subscription: jest.fn().mockReturnValue(mockSub),
    }));
    const handler = jest.fn().mockResolvedValue(undefined);
    const subscriptions = [
      {
        queue: "notification.booking.cancelled",
        routingKey: "booking.cancelled" as const,
        handler,
      },
    ];

    await (service as any).connectPubSub(subscriptions);

    const msg = makePubSubMessage(JSON.stringify(makeEvent()));
    handlers["message"](msg);
    await new Promise(process.nextTick);

    expect(handler).toHaveBeenCalled();
    expect(msg.ack).toHaveBeenCalled();
  });

  it("nacks when message JSON is invalid", async () => {
    const handlers: Record<string, Function> = {};
    const mockSub = {
      on: jest.fn((ev, fn) => {
        handlers[ev] = fn;
      }),
    };
    const { PubSub } = await import("@google-cloud/pubsub");
    (PubSub as unknown as jest.Mock).mockImplementation(() => ({
      subscription: jest.fn().mockReturnValue(mockSub),
    }));
    const errorSpy = jest.spyOn((service as any).logger, "error");
    const subscriptions = [
      {
        queue: "notification.booking.cancelled",
        routingKey: "booking.cancelled" as const,
        handler: jest.fn(),
      },
    ];

    await (service as any).connectPubSub(subscriptions);

    const msg = makePubSubMessage("not-json");
    handlers["message"](msg);

    expect(msg.nack).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("nacks when handler throws", async () => {
    const handlers: Record<string, Function> = {};
    const mockSub = {
      on: jest.fn((ev, fn) => {
        handlers[ev] = fn;
      }),
    };
    const { PubSub } = await import("@google-cloud/pubsub");
    (PubSub as unknown as jest.Mock).mockImplementation(() => ({
      subscription: jest.fn().mockReturnValue(mockSub),
    }));
    const handler = jest.fn().mockRejectedValue(new Error("handler failed"));
    const subscriptions = [
      {
        queue: "notification.booking.cancelled",
        routingKey: "booking.cancelled" as const,
        handler,
      },
    ];

    await (service as any).connectPubSub(subscriptions);

    const msg = makePubSubMessage(JSON.stringify(makeEvent()));
    handlers["message"](msg);
    await new Promise(process.nextTick);

    expect(msg.nack).toHaveBeenCalled();
  });

  it("logs error on subscription error event", async () => {
    const handlers: Record<string, Function> = {};
    const mockSub = {
      on: jest.fn((ev, fn) => {
        handlers[ev] = fn;
      }),
    };
    const { PubSub } = await import("@google-cloud/pubsub");
    (PubSub as unknown as jest.Mock).mockImplementation(() => ({
      subscription: jest.fn().mockReturnValue(mockSub),
    }));
    const errorSpy = jest.spyOn((service as any).logger, "error");
    const subscriptions = [
      {
        queue: "notification.booking.cancelled",
        routingKey: "booking.cancelled" as const,
        handler: jest.fn(),
      },
    ];

    await (service as any).connectPubSub(subscriptions);
    handlers["error"](new Error("sub error"));

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("sub error"));
  });

  it("logs error and does not throw when PubSub connection fails", async () => {
    const { PubSub } = await import("@google-cloud/pubsub");
    (PubSub as unknown as jest.Mock).mockImplementation(() => {
      throw new Error("no credentials");
    });
    const errorSpy = jest.spyOn((service as any).logger, "error");

    await expect((service as any).connectPubSub([])).resolves.not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("no credentials"),
    );
  });
});
