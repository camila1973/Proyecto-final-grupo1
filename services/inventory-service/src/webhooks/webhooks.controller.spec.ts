import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";

const MOCK_RESULT = { processed: 1, skipped: 0, durationMs: 5 };

const MOCK_SERVICE: Partial<WebhooksService> = {
  processHotelbeds: jest.fn().mockResolvedValue(MOCK_RESULT),
  processTravelClick: jest.fn().mockResolvedValue(MOCK_RESULT),
  processRoomRaccoon: jest.fn().mockResolvedValue(MOCK_RESULT),
};

const HOTELBEDS_PAYLOAD = {
  hotelCode: "HB001",
  provider: "hotelbeds",
  timestamp: "2026-03-26T10:00:00Z",
  rooms: [
    {
      roomCode: "DBL",
      date: "2026-04-01",
      allotment: 5,
      rate: 150,
      currency: "USD",
      stopSell: false,
    },
  ],
};

const TRAVELCLICK_PAYLOAD = {
  propertyCode: "TC001",
  provider: "travelclick",
  transactionId: "txn_001",
  createdAt: "2026-03-26T10:00:00Z",
  roomTypes: [
    {
      roomTypeCode: "KNG",
      startDate: "2026-04-01",
      endDate: "2026-04-01",
      availableCount: 3,
      rateAmount: 200,
      currencyCode: "USD",
      closed: false,
    },
  ],
};

const ROOMRACCOON_PAYLOAD = {
  hotelId: "RR001",
  provider: "roomraccoon",
  eventType: "availability.updated",
  occurredAt: "2026-03-26T10:00:00Z",
  availability: [
    {
      roomId: "studio_01",
      date: "2026-04-01",
      available: true,
      price: 90,
      currency: "EUR",
    },
  ],
};

describe("WebhooksController", () => {
  let controller: WebhooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [{ provide: WebhooksService, useValue: MOCK_SERVICE }],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    jest.clearAllMocks();
  });

  describe("POST /webhooks/hotelbeds", () => {
    it("should return processed count for valid payload", async () => {
      const result = await controller.hotelbeds(
        undefined,
        HOTELBEDS_PAYLOAD as any,
      );
      expect(result).toEqual(MOCK_RESULT);
    });

    it("should throw BadRequestException when hotelCode is missing", () => {
      expect(() =>
        controller.hotelbeds(undefined, { rooms: [] } as any),
      ).toThrow(BadRequestException);
    });

    it("should throw BadRequestException when rooms is not an array", () => {
      expect(() =>
        controller.hotelbeds(undefined, {
          hotelCode: "HB001",
          rooms: null,
        } as any),
      ).toThrow(BadRequestException);
    });

    it("should throw UnauthorizedException when signature is invalid", () => {
      const savedSecret = process.env.WEBHOOK_SECRET_HOTELBEDS;
      process.env.WEBHOOK_SECRET_HOTELBEDS = "test-secret";
      try {
        expect(() =>
          controller.hotelbeds("invalid-sig", HOTELBEDS_PAYLOAD as any),
        ).toThrow(UnauthorizedException);
      } finally {
        process.env.WEBHOOK_SECRET_HOTELBEDS = savedSecret;
      }
    });
  });

  describe("POST /webhooks/travelclick", () => {
    it("should return processed count for valid payload", async () => {
      const result = await controller.travelclick(
        undefined,
        TRAVELCLICK_PAYLOAD as any,
      );
      expect(result).toEqual(MOCK_RESULT);
    });

    it("should throw BadRequestException when propertyCode is missing", () => {
      expect(() =>
        controller.travelclick(undefined, { roomTypes: [] } as any),
      ).toThrow(BadRequestException);
    });

    it("should throw BadRequestException when roomTypes is not an array", () => {
      expect(() =>
        controller.travelclick(undefined, {
          propertyCode: "TC001",
          roomTypes: null,
        } as any),
      ).toThrow(BadRequestException);
    });
  });

  describe("POST /webhooks/roomraccoon", () => {
    it("should return processed count for valid payload", async () => {
      const result = await controller.roomraccoon(
        undefined,
        ROOMRACCOON_PAYLOAD as any,
      );
      expect(result).toEqual(MOCK_RESULT);
    });

    it("should throw BadRequestException when hotelId is missing", () => {
      expect(() =>
        controller.roomraccoon(undefined, { availability: [] } as any),
      ).toThrow(BadRequestException);
    });

    it("should throw BadRequestException when availability is not an array", () => {
      expect(() =>
        controller.roomraccoon(undefined, {
          hotelId: "RR001",
          availability: null,
        } as any),
      ).toThrow(BadRequestException);
    });
  });
});
