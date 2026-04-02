import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { createHmac } from "crypto";
import {
  RoomRaccoonAdapterService,
  RoomRaccoonController,
} from "./roomraccoon.adapter";
import { ExternalIdService } from "../../../external-id/external-id.service";
import { AvailabilityHandler } from "../../../events/handlers/availability.handler";
import { PriceHandler } from "../../../events/handlers/price.handler";

const mockExternalIdService = { resolve: jest.fn() };
const mockAvailabilityHandler = { handle: jest.fn() };
const mockPriceHandler = { handle: jest.fn() };

function sign(body: Buffer, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    hotelId: "HOTEL-RR-1",
    provider: "roomraccoon",
    eventType: "availability.updated",
    occurredAt: new Date().toISOString(),
    availability: [
      {
        roomId: "ROOM-RR-1",
        date: "2026-04-01",
        available: true,
        price: 180,
        currency: "USD",
      },
    ],
    ...overrides,
  };
}

describe("RoomRaccoonAdapterService", () => {
  let service: RoomRaccoonAdapterService;

  const buildService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomRaccoonAdapterService,
        { provide: ExternalIdService, useValue: mockExternalIdService },
        { provide: AvailabilityHandler, useValue: mockAvailabilityHandler },
        { provide: PriceHandler, useValue: mockPriceHandler },
      ],
    }).compile();
    return module.get<RoomRaccoonAdapterService>(RoomRaccoonAdapterService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.WEBHOOK_SECRET_ROOMRACCOON;
    service = await buildService();
  });

  afterEach(() => {
    delete process.env.WEBHOOK_SECRET_ROOMRACCOON;
  });

  it("processes a known room with price and available=true", async () => {
    mockExternalIdService.resolve.mockResolvedValue("internal-room-1");
    mockPriceHandler.handle.mockResolvedValue(undefined);
    mockAvailabilityHandler.handle.mockResolvedValue(undefined);

    const rawBody = Buffer.from(JSON.stringify(makePayload()));
    const result = await service.process(rawBody, undefined);

    expect(result).toEqual({ processed: 1, skipped: 0 });
    expect(mockPriceHandler.handle).toHaveBeenCalledWith(
      "HOTEL-RR-1",
      expect.objectContaining({ externalRoomId: "ROOM-RR-1", amount: 180 }),
    );
    expect(mockAvailabilityHandler.handle).toHaveBeenCalledWith(
      "HOTEL-RR-1",
      expect.objectContaining({ externalRoomId: "ROOM-RR-1", available: true }),
    );
  });

  it("skips price call when available=false", async () => {
    mockExternalIdService.resolve.mockResolvedValue("internal-room-1");
    mockAvailabilityHandler.handle.mockResolvedValue(undefined);

    const payload = makePayload({
      availability: [
        {
          roomId: "ROOM-RR-1",
          date: "2026-04-01",
          available: false,
          price: 180,
          currency: "USD",
        },
      ],
    });
    const rawBody = Buffer.from(JSON.stringify(payload));
    const result = await service.process(rawBody, undefined);

    expect(result).toEqual({ processed: 1, skipped: 0 });
    expect(mockPriceHandler.handle).not.toHaveBeenCalled();
    expect(mockAvailabilityHandler.handle).toHaveBeenCalledWith(
      "HOTEL-RR-1",
      expect.objectContaining({ available: false }),
    );
  });

  it("skips price call when no price provided", async () => {
    mockExternalIdService.resolve.mockResolvedValue("internal-room-1");
    mockAvailabilityHandler.handle.mockResolvedValue(undefined);

    const payload = makePayload({
      availability: [
        { roomId: "ROOM-RR-1", date: "2026-04-01", available: true },
      ],
    });
    const rawBody = Buffer.from(JSON.stringify(payload));
    const result = await service.process(rawBody, undefined);

    expect(result).toEqual({ processed: 1, skipped: 0 });
    expect(mockPriceHandler.handle).not.toHaveBeenCalled();
  });

  it("skips room when no mapping found", async () => {
    mockExternalIdService.resolve.mockResolvedValue(null);

    const rawBody = Buffer.from(JSON.stringify(makePayload()));
    const result = await service.process(rawBody, undefined);

    expect(result).toEqual({ processed: 0, skipped: 1 });
    expect(mockPriceHandler.handle).not.toHaveBeenCalled();
    expect(mockAvailabilityHandler.handle).not.toHaveBeenCalled();
  });

  it("throws BadRequestException for payload missing hotelId", async () => {
    const rawBody = Buffer.from(JSON.stringify({ availability: [] }));
    await expect(service.process(rawBody, undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("throws BadRequestException when availability is not an array", async () => {
    const rawBody = Buffer.from(
      JSON.stringify({ hotelId: "H1", availability: "bad" }),
    );
    await expect(service.process(rawBody, undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  describe("HMAC verification", () => {
    beforeEach(() => {
      process.env.WEBHOOK_SECRET_ROOMRACCOON = "rr-secret";
    });

    afterEach(() => {
      delete process.env.WEBHOOK_SECRET_ROOMRACCOON;
    });

    it("throws UnauthorizedException when signature is missing", async () => {
      const rawBody = Buffer.from(JSON.stringify(makePayload()));
      await expect(service.process(rawBody, undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("throws UnauthorizedException when signature is wrong", async () => {
      const rawBody = Buffer.from(JSON.stringify(makePayload()));
      await expect(service.process(rawBody, "bad-sig")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("passes when signature is correct", async () => {
      mockExternalIdService.resolve.mockResolvedValue(null);
      const rawBody = Buffer.from(JSON.stringify(makePayload()));
      const sig = sign(rawBody, "rr-secret");
      const result = await service.process(rawBody, sig);
      expect(result).toEqual({ processed: 0, skipped: 1 });
    });
  });
});

describe("RoomRaccoonController", () => {
  it("delegates to RoomRaccoonAdapterService.process", async () => {
    const mockService = {
      process: jest.fn().mockResolvedValue({ processed: 3, skipped: 0 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomRaccoonController],
      providers: [
        { provide: RoomRaccoonAdapterService, useValue: mockService },
      ],
    }).compile();
    const controller = module.get<RoomRaccoonController>(RoomRaccoonController);
    const req = { body: Buffer.from("{}") } as any;
    const result = await controller.handle("rr-sig", req);
    expect(result).toEqual({ processed: 3, skipped: 0 });
    expect(mockService.process).toHaveBeenCalledWith(req.body, "rr-sig");
  });
});
