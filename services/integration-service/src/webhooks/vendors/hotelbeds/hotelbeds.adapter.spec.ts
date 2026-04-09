import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { createHmac } from "crypto";
import {
  HotelbedsAdapterService,
  HotelbedsController,
} from "./hotelbeds.adapter";
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
    hotelCode: "HOTEL-1",
    provider: "hotelbeds",
    timestamp: new Date().toISOString(),
    rooms: [
      {
        roomCode: "ROOM-1",
        date: "2026-04-01",
        allotment: 2,
        rate: 150,
        currency: "USD",
        stopSell: false,
      },
    ],
    ...overrides,
  };
}

describe("HotelbedsAdapterService", () => {
  let service: HotelbedsAdapterService;

  const buildService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HotelbedsAdapterService,
        { provide: ExternalIdService, useValue: mockExternalIdService },
        { provide: AvailabilityHandler, useValue: mockAvailabilityHandler },
        { provide: PriceHandler, useValue: mockPriceHandler },
      ],
    }).compile();
    return module.get<HotelbedsAdapterService>(HotelbedsAdapterService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.WEBHOOK_SECRET_HOTELBEDS;
    service = await buildService();
  });

  afterEach(() => {
    delete process.env.WEBHOOK_SECRET_HOTELBEDS;
  });

  it("processes a known room with rate and stopSell=false", async () => {
    mockExternalIdService.resolve.mockResolvedValue("internal-room-1");
    mockPriceHandler.handle.mockResolvedValue(undefined);
    mockAvailabilityHandler.handle.mockResolvedValue(undefined);

    const rawBody = Buffer.from(JSON.stringify(makePayload()));
    const result = await service.process(rawBody, undefined);

    expect(result).toEqual({ processed: 1, skipped: 0 });
    expect(mockPriceHandler.handle).toHaveBeenCalledWith(
      "HOTEL-1",
      expect.objectContaining({ externalRoomId: "ROOM-1", amount: 150 }),
    );
    expect(mockAvailabilityHandler.handle).toHaveBeenCalledWith(
      "HOTEL-1",
      expect.objectContaining({ externalRoomId: "ROOM-1", available: true }),
    );
  });

  it("skips price call when stopSell=true, still calls availability", async () => {
    mockExternalIdService.resolve.mockResolvedValue("internal-room-1");
    mockAvailabilityHandler.handle.mockResolvedValue(undefined);

    const payload = makePayload({
      rooms: [
        {
          roomCode: "ROOM-1",
          date: "2026-04-01",
          allotment: 0,
          rate: 150,
          currency: "USD",
          stopSell: true,
        },
      ],
    });
    const rawBody = Buffer.from(JSON.stringify(payload));
    const result = await service.process(rawBody, undefined);

    expect(result).toEqual({ processed: 1, skipped: 0 });
    expect(mockPriceHandler.handle).not.toHaveBeenCalled();
    expect(mockAvailabilityHandler.handle).toHaveBeenCalledWith(
      "HOTEL-1",
      expect.objectContaining({ available: false }),
    );
  });

  it("skips room when no mapping found", async () => {
    mockExternalIdService.resolve.mockResolvedValue(null);

    const rawBody = Buffer.from(JSON.stringify(makePayload()));
    const result = await service.process(rawBody, undefined);

    expect(result).toEqual({ processed: 0, skipped: 1 });
    expect(mockPriceHandler.handle).not.toHaveBeenCalled();
    expect(mockAvailabilityHandler.handle).not.toHaveBeenCalled();
  });

  it("skips price call when no rate on room", async () => {
    mockExternalIdService.resolve.mockResolvedValue("internal-room-1");
    mockAvailabilityHandler.handle.mockResolvedValue(undefined);

    const payload = makePayload({
      rooms: [
        {
          roomCode: "ROOM-1",
          date: "2026-04-01",
          allotment: 2,
          stopSell: false,
        },
      ],
    });
    const rawBody = Buffer.from(JSON.stringify(payload));
    const result = await service.process(rawBody, undefined);

    expect(result).toEqual({ processed: 1, skipped: 0 });
    expect(mockPriceHandler.handle).not.toHaveBeenCalled();
  });

  it("throws BadRequestException for invalid payload missing hotelCode", async () => {
    const rawBody = Buffer.from(
      JSON.stringify({ provider: "hotelbeds", rooms: [] }),
    );
    await expect(service.process(rawBody, undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("throws BadRequestException when rooms is not an array", async () => {
    const rawBody = Buffer.from(
      JSON.stringify({ hotelCode: "H1", rooms: "bad" }),
    );
    await expect(service.process(rawBody, undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  describe("HMAC verification", () => {
    beforeEach(() => {
      process.env.WEBHOOK_SECRET_HOTELBEDS = "test-secret";
    });

    afterEach(() => {
      delete process.env.WEBHOOK_SECRET_HOTELBEDS;
    });

    it("throws UnauthorizedException when signature is missing", async () => {
      const rawBody = Buffer.from(JSON.stringify(makePayload()));
      await expect(service.process(rawBody, undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("throws UnauthorizedException when signature is wrong", async () => {
      const rawBody = Buffer.from(JSON.stringify(makePayload()));
      await expect(service.process(rawBody, "wrong-signature")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("passes when signature is correct", async () => {
      mockExternalIdService.resolve.mockResolvedValue(null);
      const rawBody = Buffer.from(JSON.stringify(makePayload()));
      const sig = sign(rawBody, "test-secret");
      const result = await service.process(rawBody, sig);
      expect(result).toEqual({ processed: 0, skipped: 1 });
    });
  });
});

describe("HotelbedsController", () => {
  it("delegates to HotelbedsAdapterService.process", async () => {
    const mockService = {
      process: jest.fn().mockResolvedValue({ processed: 1, skipped: 0 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HotelbedsController],
      providers: [{ provide: HotelbedsAdapterService, useValue: mockService }],
    }).compile();
    const controller = module.get<HotelbedsController>(HotelbedsController);
    const req = { body: Buffer.from("{}") } as any;
    const result = await controller.handle("my-sig", req);
    expect(result).toEqual({ processed: 1, skipped: 0 });
    expect(mockService.process).toHaveBeenCalledWith(req.body, "my-sig");
  });
});
