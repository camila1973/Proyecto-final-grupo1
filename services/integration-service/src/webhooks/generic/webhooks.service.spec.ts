import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { createHmac } from "crypto";
import { WebhooksService } from "./webhooks.service";
import { KYSELY } from "../../database/database.provider";
import { PropertyHandler } from "../../events/handlers/property.handler";
import { RoomHandler } from "../../events/handlers/room.handler";
import { AvailabilityHandler } from "../../events/handlers/availability.handler";
import { PriceHandler } from "../../events/handlers/price.handler";
import { BookingHandler } from "../../events/handlers/booking.handler";
import { HoldHandler } from "../../events/handlers/hold.handler";

const makeRegistration = (overrides = {}) => ({
  id: "reg-1",
  partnerId: "partner-1",
  name: "Test Partner",
  adapterType: "generic",
  signingSecret: "secret",
  enabled: true,
  createdAt: new Date(),
  ...overrides,
});

function buildDb(registration: any, alreadyProcessed: any = null) {
  return {
    selectFrom: jest.fn((table: string) => {
      const mock = {
        selectAll: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest
          .fn()
          .mockResolvedValue(
            table === "pmsRegistrations" ? registration : alreadyProcessed,
          ),
      };
      return mock;
    }),
    insertInto: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        execute: jest.fn().mockResolvedValue([]),
      }),
    }),
  };
}

function sign(body: Buffer, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

const mockPropertyHandler = { handle: jest.fn() };
const mockRoomHandler = { handle: jest.fn() };
const mockAvailabilityHandler = { handle: jest.fn() };
const mockPriceHandler = { handle: jest.fn() };
const mockBookingHandler = { handle: jest.fn() };
const mockHoldHandler = { handle: jest.fn() };

describe("WebhooksService", () => {
  const buildService = async (db: any) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: KYSELY, useValue: db },
        { provide: PropertyHandler, useValue: mockPropertyHandler },
        { provide: RoomHandler, useValue: mockRoomHandler },
        { provide: AvailabilityHandler, useValue: mockAvailabilityHandler },
        { provide: PriceHandler, useValue: mockPriceHandler },
        { provide: BookingHandler, useValue: mockBookingHandler },
        { provide: HoldHandler, useValue: mockHoldHandler },
      ],
    }).compile();
    return module.get<WebhooksService>(WebhooksService);
  };

  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException for unknown partner", async () => {
    const db = buildDb(null);
    const service = await buildService(db);
    const body = Buffer.from("{}");
    await expect(service.processEvent("unknown", body, "sig")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("throws NotFoundException for disabled partner", async () => {
    const db = buildDb(makeRegistration({ enabled: false }));
    const service = await buildService(db);
    const body = Buffer.from("{}");
    await expect(
      service.processEvent("partner-1", body, "sig"),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws UnauthorizedException for invalid HMAC", async () => {
    const db = buildDb(makeRegistration());
    const service = await buildService(db);
    const body = Buffer.from(
      JSON.stringify({
        eventId: "e1",
        eventType: "property.created",
        occurredAt: new Date().toISOString(),
        data: {},
      }),
    );
    await expect(
      service.processEvent("partner-1", body, "bad-signature"),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("returns duplicate for already-processed eventId", async () => {
    const body = Buffer.from(
      JSON.stringify({
        eventId: "e1",
        eventType: "property.created",
        occurredAt: new Date().toISOString(),
        data: {},
      }),
    );
    const sig = sign(body, "secret");

    const db = {
      selectFrom: jest.fn((table: string) => ({
        selectAll: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest
          .fn()
          .mockResolvedValue(
            table === "pmsRegistrations"
              ? makeRegistration()
              : { id: "existing" },
          ),
      })),
      insertInto: jest.fn().mockReturnValue({
        values: jest
          .fn()
          .mockReturnValue({ execute: jest.fn().mockResolvedValue([]) }),
      }),
    };
    const service = await buildService(db);
    const result = await service.processEvent("partner-1", body, sig);
    expect(result).toEqual({ status: "duplicate" });
  });

  it("routes property.created to propertyHandler and returns ok", async () => {
    mockPropertyHandler.handle.mockResolvedValue(undefined);
    const body = Buffer.from(
      JSON.stringify({
        eventId: "e2",
        eventType: "property.created",
        occurredAt: new Date().toISOString(),
        data: { externalId: "ext-1" },
      }),
    );
    const sig = sign(body, "secret");

    const db = {
      selectFrom: jest.fn((table: string) => ({
        selectAll: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        executeTakeFirst: jest
          .fn()
          .mockResolvedValue(
            table === "pmsRegistrations" ? makeRegistration() : null,
          ),
      })),
      insertInto: jest.fn().mockReturnValue({
        values: jest
          .fn()
          .mockReturnValue({ execute: jest.fn().mockResolvedValue([]) }),
      }),
    };
    const service = await buildService(db);
    const result = await service.processEvent("partner-1", body, sig);
    expect(result).toEqual({ status: "ok" });
    expect(mockPropertyHandler.handle).toHaveBeenCalledWith(
      "partner-1",
      "property.created",
      expect.objectContaining({ externalId: "ext-1" }),
    );
  });
});
