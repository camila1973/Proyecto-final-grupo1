import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { createHmac } from "crypto";
import {
  TravelClickAdapterService,
  TravelClickController,
} from "./travelclick.adapter";
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
    propertyCode: "PROP-1",
    provider: "travelclick",
    transactionId: "txn-1",
    createdAt: new Date().toISOString(),
    roomTypes: [
      {
        roomTypeCode: "ROOM-1",
        startDate: "2026-04-01",
        endDate: "2026-04-01",
        availableCount: 2,
        rateAmount: 200,
        currencyCode: "USD",
        closed: false,
      },
    ],
    ...overrides,
  };
}

describe("TravelClickAdapterService", () => {
  let service: TravelClickAdapterService;

  const buildService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TravelClickAdapterService,
        { provide: ExternalIdService, useValue: mockExternalIdService },
        { provide: AvailabilityHandler, useValue: mockAvailabilityHandler },
        { provide: PriceHandler, useValue: mockPriceHandler },
      ],
    }).compile();
    return module.get<TravelClickAdapterService>(TravelClickAdapterService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.WEBHOOK_SECRET_TRAVELCLICK;
    service = await buildService();
  });

  afterEach(() => {
    delete process.env.WEBHOOK_SECRET_TRAVELCLICK;
  });

  it("processes a known room with rate and closed=false", async () => {
    mockExternalIdService.resolve.mockResolvedValue("internal-room-1");
    mockPriceHandler.handle.mockResolvedValue(undefined);
    mockAvailabilityHandler.handle.mockResolvedValue(undefined);

    const rawBody = Buffer.from(JSON.stringify(makePayload()));
    const result = await service.process(rawBody, undefined);

    expect(result).toEqual({ processed: 1, skipped: 0 });
    expect(mockPriceHandler.handle).toHaveBeenCalledWith(
      "PROP-1",
      expect.objectContaining({
        externalRoomId: "ROOM-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-01",
        amount: 200,
      }),
    );
    expect(mockAvailabilityHandler.handle).toHaveBeenCalledWith(
      "PROP-1",
      expect.objectContaining({ externalRoomId: "ROOM-1", available: true }),
    );
  });

  it("skips price call when closed=true", async () => {
    mockExternalIdService.resolve.mockResolvedValue("internal-room-1");
    mockAvailabilityHandler.handle.mockResolvedValue(undefined);

    const payload = makePayload({
      roomTypes: [
        {
          roomTypeCode: "ROOM-1",
          startDate: "2026-04-01",
          endDate: "2026-04-01",
          availableCount: 0,
          rateAmount: 200,
          currencyCode: "USD",
          closed: true,
        },
      ],
    });
    const rawBody = Buffer.from(JSON.stringify(payload));
    const result = await service.process(rawBody, undefined);

    expect(result).toEqual({ processed: 1, skipped: 0 });
    expect(mockPriceHandler.handle).not.toHaveBeenCalled();
    expect(mockAvailabilityHandler.handle).toHaveBeenCalledWith(
      "PROP-1",
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

  it("throws BadRequestException for payload missing propertyCode", async () => {
    const rawBody = Buffer.from(JSON.stringify({ roomTypes: [] }));
    await expect(service.process(rawBody, undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("throws BadRequestException when roomTypes is not an array", async () => {
    const rawBody = Buffer.from(
      JSON.stringify({ propertyCode: "P1", roomTypes: "bad" }),
    );
    await expect(service.process(rawBody, undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  describe("HMAC verification", () => {
    beforeEach(() => {
      process.env.WEBHOOK_SECRET_TRAVELCLICK = "tc-secret";
    });

    afterEach(() => {
      delete process.env.WEBHOOK_SECRET_TRAVELCLICK;
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
      const sig = sign(rawBody, "tc-secret");
      const result = await service.process(rawBody, sig);
      expect(result).toEqual({ processed: 0, skipped: 1 });
    });
  });
});

describe("TravelClickController", () => {
  it("delegates to TravelClickAdapterService.process", async () => {
    const mockService = {
      process: jest.fn().mockResolvedValue({ processed: 2, skipped: 0 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TravelClickController],
      providers: [
        { provide: TravelClickAdapterService, useValue: mockService },
      ],
    }).compile();
    const controller = module.get<TravelClickController>(TravelClickController);
    const req = { body: Buffer.from("{}") } as any;
    const result = await controller.handle("tc-sig", req);
    expect(result).toEqual({ processed: 2, skipped: 0 });
    expect(mockService.process).toHaveBeenCalledWith(req.body, "tc-sig");
  });
});
