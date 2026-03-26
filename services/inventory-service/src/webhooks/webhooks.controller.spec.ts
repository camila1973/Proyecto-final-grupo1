import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';
import { AvailabilityStore } from './availability.store.js';
import { HotelbedsWebhookDto } from './dto/hotelbeds-webhook.dto.js';
import { TravelClickWebhookDto } from './dto/travelclick-webhook.dto.js';
import { RoomRaccoonWebhookDto } from './dto/roomraccoon-webhook.dto.js';

const HOTELBEDS_PAYLOAD: HotelbedsWebhookDto = {
  hotelCode: 'HB001',
  provider: 'hotelbeds',
  timestamp: '2026-03-26T10:00:00Z',
  rooms: [
    {
      roomCode: 'DBL',
      date: '2026-04-01',
      allotment: 5,
      rate: 150,
      currency: 'USD',
      stopSell: false,
    },
  ],
};

const TRAVELCLICK_PAYLOAD: TravelClickWebhookDto = {
  propertyCode: 'TC001',
  provider: 'travelclick',
  transactionId: 'txn_001',
  createdAt: '2026-03-26T10:00:00Z',
  roomTypes: [
    {
      roomTypeCode: 'KNG',
      startDate: '2026-04-01',
      endDate: '2026-04-01',
      availableCount: 3,
      rateAmount: 200,
      currencyCode: 'USD',
      closed: false,
    },
  ],
};

const ROOMRACCOON_PAYLOAD: RoomRaccoonWebhookDto = {
  hotelId: 'RR001',
  provider: 'roomraccoon',
  eventType: 'availability.updated',
  occurredAt: '2026-03-26T10:00:00Z',
  availability: [
    {
      roomId: 'studio_01',
      date: '2026-04-01',
      available: true,
      price: 90,
      currency: 'EUR',
    },
  ],
};

describe('WebhooksController', () => {
  let controller: WebhooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [WebhooksService, AvailabilityStore],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
  });

  describe('POST /webhooks/hotelbeds', () => {
    it('should return processed count for valid payload', () => {
      const result = controller.hotelbeds(HOTELBEDS_PAYLOAD);
      expect(result.processed).toBe(1);
    });

    it('should throw BadRequestException when hotelCode is missing', () => {
      expect(() =>
        controller.hotelbeds({ rooms: [] } as unknown as HotelbedsWebhookDto),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when rooms is not an array', () => {
      expect(() =>
        controller.hotelbeds({
          hotelCode: 'HB001',
          rooms: null,
        } as unknown as HotelbedsWebhookDto),
      ).toThrow(BadRequestException);
    });
  });

  describe('POST /webhooks/travelclick', () => {
    it('should return processed count for valid payload', () => {
      const result = controller.travelclick(TRAVELCLICK_PAYLOAD);
      expect(result.processed).toBe(1);
    });

    it('should throw BadRequestException when propertyCode is missing', () => {
      expect(() =>
        controller.travelclick({
          roomTypes: [],
        } as unknown as TravelClickWebhookDto),
      ).toThrow(BadRequestException);
    });
  });

  describe('POST /webhooks/roomraccoon', () => {
    it('should return processed count for valid payload', () => {
      const result = controller.roomraccoon(ROOMRACCOON_PAYLOAD);
      expect(result.processed).toBe(1);
    });

    it('should throw BadRequestException when hotelId is missing', () => {
      expect(() =>
        controller.roomraccoon({
          availability: [],
        } as unknown as RoomRaccoonWebhookDto),
      ).toThrow(BadRequestException);
    });
  });
});
