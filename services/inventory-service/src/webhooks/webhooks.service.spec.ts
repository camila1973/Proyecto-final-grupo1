import { WebhooksService } from './webhooks.service.js';
import { AvailabilityStore } from './availability.store.js';
import { HotelbedsWebhookDto } from './dto/hotelbeds-webhook.dto.js';
import { TravelClickWebhookDto } from './dto/travelclick-webhook.dto.js';
import { RoomRaccoonWebhookDto } from './dto/roomraccoon-webhook.dto.js';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let store: AvailabilityStore;

  beforeEach(() => {
    store = new AvailabilityStore();
    service = new WebhooksService(store);
  });

  describe('processHotelbeds', () => {
    it('should store one SKU per room entry', () => {
      const payload: HotelbedsWebhookDto = {
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
          {
            roomCode: 'SGL',
            date: '2026-04-01',
            allotment: 0,
            rate: 100,
            currency: 'USD',
            stopSell: false,
          },
        ],
      };

      const result = service.processHotelbeds(payload);

      expect(result.processed).toBe(2);
      expect(store.size()).toBe(2);
    });

    it('should mark SKU as unavailable when stopSell is true', () => {
      const payload: HotelbedsWebhookDto = {
        hotelCode: 'HB001',
        provider: 'hotelbeds',
        timestamp: '2026-03-26T10:00:00Z',
        rooms: [
          {
            roomCode: 'DBL',
            date: '2026-04-01',
            allotment: 10,
            rate: 150,
            currency: 'USD',
            stopSell: true,
          },
        ],
      };

      service.processHotelbeds(payload);
      const record = store.get('HB001:DBL:2026-04-01');

      expect(record).toBeDefined();
      expect(record!.available).toBe(false);
      expect(record!.stopSell).toBe(true);
    });

    it('should mark SKU as unavailable when allotment is 0', () => {
      const payload: HotelbedsWebhookDto = {
        hotelCode: 'HB001',
        provider: 'hotelbeds',
        timestamp: '2026-03-26T10:00:00Z',
        rooms: [
          {
            roomCode: 'DBL',
            date: '2026-04-01',
            allotment: 0,
            rate: 150,
            currency: 'USD',
            stopSell: false,
          },
        ],
      };

      service.processHotelbeds(payload);
      const record = store.get('HB001:DBL:2026-04-01');

      expect(record!.available).toBe(false);
    });

    it('should handle a bulk load of 10,000 SKUs within 200ms', () => {
      const rooms = Array.from({ length: 10000 }, (_, i) => ({
        roomCode: `ROOM_${i}`,
        date: '2026-04-01',
        allotment: 5,
        rate: 100,
        currency: 'USD',
        stopSell: false,
      }));

      const payload: HotelbedsWebhookDto = {
        hotelCode: 'HB_BULK',
        provider: 'hotelbeds',
        timestamp: '2026-03-26T10:00:00Z',
        rooms,
      };

      const result = service.processHotelbeds(payload);

      expect(result.processed).toBe(10000);
      expect(result.durationMs).toBeLessThan(200);
      expect(store.size()).toBe(10000);
    });

    it('should upsert an existing SKU with new data', () => {
      const base: HotelbedsWebhookDto = {
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
      service.processHotelbeds(base);

      const updated: HotelbedsWebhookDto = {
        ...base,
        timestamp: '2026-03-26T10:01:00Z',
        rooms: [{ ...base.rooms[0], allotment: 2, rate: 180 }],
      };
      service.processHotelbeds(updated);

      const record = store.get('HB001:DBL:2026-04-01');
      expect(record!.allotment).toBe(2);
      expect(record!.price).toBe(180);
      expect(store.size()).toBe(1);
    });
  });

  describe('processTravelClick', () => {
    it('should expand a multi-day range into individual SKUs', () => {
      const payload: TravelClickWebhookDto = {
        propertyCode: 'TC001',
        provider: 'travelclick',
        transactionId: 'txn_001',
        createdAt: '2026-03-26T10:00:00Z',
        roomTypes: [
          {
            roomTypeCode: 'KNG',
            startDate: '2026-04-01',
            endDate: '2026-04-03',
            availableCount: 3,
            rateAmount: 200,
            currencyCode: 'USD',
            closed: false,
          },
        ],
      };

      const result = service.processTravelClick(payload);

      // 3 days: Apr 1, Apr 2, Apr 3
      expect(result.processed).toBe(3);
      expect(store.get('TC001:KNG:2026-04-01')).toBeDefined();
      expect(store.get('TC001:KNG:2026-04-02')).toBeDefined();
      expect(store.get('TC001:KNG:2026-04-03')).toBeDefined();
    });

    it('should mark closed rooms as unavailable', () => {
      const payload: TravelClickWebhookDto = {
        propertyCode: 'TC001',
        provider: 'travelclick',
        transactionId: 'txn_002',
        createdAt: '2026-03-26T10:00:00Z',
        roomTypes: [
          {
            roomTypeCode: 'KNG',
            startDate: '2026-04-01',
            endDate: '2026-04-01',
            availableCount: 5,
            rateAmount: 200,
            currencyCode: 'USD',
            closed: true,
          },
        ],
      };

      service.processTravelClick(payload);
      const record = store.get('TC001:KNG:2026-04-01');

      expect(record!.available).toBe(false);
      expect(record!.stopSell).toBe(true);
    });

    it('should handle bulk 10,000 SKUs from multi-room multi-day payload within 200ms', () => {
      // 100 room types × 100 days = 10,000 SKUs
      const roomTypes = Array.from({ length: 100 }, (_, i) => ({
        roomTypeCode: `RT_${i}`,
        startDate: '2026-04-01',
        endDate: '2026-07-09', // 100 days
        availableCount: 5,
        rateAmount: 150,
        currencyCode: 'USD',
        closed: false,
      }));

      const payload: TravelClickWebhookDto = {
        propertyCode: 'TC_BULK',
        provider: 'travelclick',
        transactionId: 'txn_bulk',
        createdAt: '2026-03-26T10:00:00Z',
        roomTypes,
      };

      const result = service.processTravelClick(payload);

      expect(result.processed).toBe(10000);
      expect(result.durationMs).toBeLessThan(200);
    });
  });

  describe('processRoomRaccoon', () => {
    it('should store one SKU per availability entry', () => {
      const payload: RoomRaccoonWebhookDto = {
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
          {
            roomId: 'studio_02',
            date: '2026-04-01',
            available: false,
            price: 90,
            currency: 'EUR',
          },
        ],
      };

      const result = service.processRoomRaccoon(payload);

      expect(result.processed).toBe(2);
      expect(store.get('RR001:studio_01:2026-04-01')!.available).toBe(true);
      expect(store.get('RR001:studio_02:2026-04-01')!.available).toBe(false);
    });

    it('should set allotment to 0 for unavailable rooms', () => {
      const payload: RoomRaccoonWebhookDto = {
        hotelId: 'RR001',
        provider: 'roomraccoon',
        eventType: 'availability.updated',
        occurredAt: '2026-03-26T10:00:00Z',
        availability: [
          {
            roomId: 'studio_01',
            date: '2026-04-01',
            available: false,
            price: 90,
            currency: 'EUR',
          },
        ],
      };

      service.processRoomRaccoon(payload);
      const record = store.get('RR001:studio_01:2026-04-01');

      expect(record!.allotment).toBe(0);
    });
  });
});
