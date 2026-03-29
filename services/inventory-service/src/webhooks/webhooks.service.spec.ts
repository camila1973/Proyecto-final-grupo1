import { WebhooksService } from "./webhooks.service";
import type { PropertiesRepository } from "../properties/properties.repository";
import type { RoomsRepository } from "../rooms/rooms.repository";
import type { RoomRatesService } from "../room-rates/room-rates.service";
import type { AvailabilityRepository } from "../availability/availability.repository";
import type { EventsPublisher } from "../events/events.publisher";

function makeService(
  overrides: Partial<{
    propertiesRepo: Partial<PropertiesRepository>;
    roomsRepo: Partial<RoomsRepository>;
    ratesService: Partial<RoomRatesService>;
    availabilityRepo: Partial<AvailabilityRepository>;
    events: Partial<EventsPublisher>;
  }> = {},
) {
  const propertiesRepo = {
    findByName: jest.fn().mockResolvedValue(null),
    ...overrides.propertiesRepo,
  } as unknown as PropertiesRepository;

  const roomsRepo = {
    findByPropertyAndType: jest.fn().mockResolvedValue(null),
    ...overrides.roomsRepo,
  } as unknown as RoomsRepository;

  const ratesService = {
    create: jest.fn().mockResolvedValue({}),
    ...overrides.ratesService,
  } as unknown as RoomRatesService;

  const availabilityRepo = {
    blockDates: jest.fn().mockResolvedValue(undefined),
    unblockDates: jest.fn().mockResolvedValue(undefined),
    ...overrides.availabilityRepo,
  } as unknown as AvailabilityRepository;

  const events = {
    publish: jest.fn().mockResolvedValue(undefined),
    ...overrides.events,
  } as unknown as EventsPublisher;

  return new WebhooksService(
    propertiesRepo,
    roomsRepo,
    ratesService,
    availabilityRepo,
    events,
  );
}

const PROPERTY = { id: "prop-1", partner_id: "partner-1", name: "HB001" };
const ROOM = { id: "room-1", property_id: "prop-1", room_type: "double" };

describe("WebhooksService", () => {
  describe("processHotelbeds", () => {
    it("should skip all rooms when property is not found", async () => {
      const service = makeService();
      const result = await service.processHotelbeds({
        hotelCode: "UNKNOWN",
        provider: "hotelbeds",
        timestamp: "2026-04-01T00:00:00Z",
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
      });
      expect(result.processed).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it("should process matching rooms and publish events", async () => {
      const publish = jest.fn().mockResolvedValue(undefined);
      const service = makeService({
        propertiesRepo: { findByName: jest.fn().mockResolvedValue(PROPERTY) },
        roomsRepo: { findByPropertyAndType: jest.fn().mockResolvedValue(ROOM) },
        events: { publish },
      });

      const result = await service.processHotelbeds({
        hotelCode: "HB001",
        provider: "hotelbeds",
        timestamp: "2026-04-01T00:00:00Z",
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
      });

      expect(result.processed).toBe(1);
      expect(publish).toHaveBeenCalledWith(
        "inventory.room.updated",
        expect.objectContaining({ roomId: "room-1" }),
      );
    });

    it("should block dates when stopSell is true", async () => {
      const blockDates = jest.fn().mockResolvedValue(undefined);
      const service = makeService({
        propertiesRepo: { findByName: jest.fn().mockResolvedValue(PROPERTY) },
        roomsRepo: { findByPropertyAndType: jest.fn().mockResolvedValue(ROOM) },
        availabilityRepo: {
          blockDates,
          unblockDates: jest.fn().mockResolvedValue(undefined),
        },
      });

      await service.processHotelbeds({
        hotelCode: "HB001",
        provider: "hotelbeds",
        timestamp: "2026-04-01T00:00:00Z",
        rooms: [
          {
            roomCode: "DBL",
            date: "2026-04-01",
            allotment: 10,
            rate: 150,
            currency: "USD",
            stopSell: true,
          },
        ],
      });

      expect(blockDates).toHaveBeenCalledWith(
        "room-1",
        "2026-04-01",
        "2026-04-02",
      );
    });

    it("should normalise room type codes (DBL → double, SGL → single)", async () => {
      const findByPropertyAndType = jest.fn().mockResolvedValue(ROOM);
      const service = makeService({
        propertiesRepo: { findByName: jest.fn().mockResolvedValue(PROPERTY) },
        roomsRepo: { findByPropertyAndType },
      });

      await service.processHotelbeds({
        hotelCode: "HB001",
        provider: "hotelbeds",
        timestamp: "2026-04-01T00:00:00Z",
        rooms: [
          {
            roomCode: "SGL",
            date: "2026-04-01",
            allotment: 3,
            rate: 100,
            currency: "USD",
            stopSell: false,
          },
        ],
      });

      expect(findByPropertyAndType).toHaveBeenCalledWith("prop-1", "single");
    });

    it("should convert prices to USD using static FX rates", async () => {
      const create = jest.fn().mockResolvedValue({});
      const service = makeService({
        propertiesRepo: { findByName: jest.fn().mockResolvedValue(PROPERTY) },
        roomsRepo: { findByPropertyAndType: jest.fn().mockResolvedValue(ROOM) },
        ratesService: { create },
      });

      await service.processHotelbeds({
        hotelCode: "HB001",
        provider: "hotelbeds",
        timestamp: "2026-04-01T00:00:00Z",
        rooms: [
          {
            roomCode: "DBL",
            date: "2026-04-01",
            allotment: 5,
            rate: 100,
            currency: "EUR",
            stopSell: false,
          },
        ],
      });

      expect(create).toHaveBeenCalledWith(
        "room-1",
        "partner-1",
        expect.objectContaining({
          priceUsd: 108, // 100 EUR × 1.08
          currency: "EUR",
        }),
      );
    });
  });

  describe("processTravelClick", () => {
    it("should skip when property not found", async () => {
      const service = makeService();
      const result = await service.processTravelClick({
        propertyCode: "UNKNOWN",
        provider: "travelclick",
        transactionId: "txn",
        createdAt: "2026-04-01T00:00:00Z",
        roomTypes: [
          {
            roomTypeCode: "KNG",
            startDate: "2026-04-01",
            endDate: "2026-04-03",
            availableCount: 3,
            rateAmount: 200,
            currencyCode: "USD",
            closed: false,
          },
        ],
      });
      expect(result.processed).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it("should block date range when closed", async () => {
      const blockDates = jest.fn().mockResolvedValue(undefined);
      const service = makeService({
        propertiesRepo: { findByName: jest.fn().mockResolvedValue(PROPERTY) },
        roomsRepo: { findByPropertyAndType: jest.fn().mockResolvedValue(ROOM) },
        availabilityRepo: {
          blockDates,
          unblockDates: jest.fn().mockResolvedValue(undefined),
        },
      });

      await service.processTravelClick({
        propertyCode: "TC001",
        provider: "travelclick",
        transactionId: "txn",
        createdAt: "2026-04-01T00:00:00Z",
        roomTypes: [
          {
            roomTypeCode: "KNG",
            startDate: "2026-04-01",
            endDate: "2026-04-05",
            availableCount: 0,
            closed: true,
          },
        ],
      });

      expect(blockDates).toHaveBeenCalledWith(
        "room-1",
        "2026-04-01",
        "2026-04-05",
      );
    });
  });

  describe("processRoomRaccoon", () => {
    it("should skip when property not found", async () => {
      const service = makeService();
      const result = await service.processRoomRaccoon({
        hotelId: "UNKNOWN",
        provider: "roomraccoon",
        eventType: "availability.updated",
        occurredAt: "2026-04-01T00:00:00Z",
        availability: [
          {
            roomId: "studio_01",
            date: "2026-04-01",
            available: true,
            price: 90,
            currency: "EUR",
          },
        ],
      });
      expect(result.processed).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it("should process available room and unblock dates", async () => {
      const unblockDates = jest.fn().mockResolvedValue(undefined);
      const service = makeService({
        propertiesRepo: { findByName: jest.fn().mockResolvedValue(PROPERTY) },
        roomsRepo: { findByPropertyAndType: jest.fn().mockResolvedValue(ROOM) },
        availabilityRepo: {
          blockDates: jest.fn().mockResolvedValue(undefined),
          unblockDates,
        },
      });

      const result = await service.processRoomRaccoon({
        hotelId: "RR001",
        provider: "roomraccoon",
        eventType: "availability.updated",
        occurredAt: "2026-04-01T00:00:00Z",
        availability: [
          {
            roomId: "studio_01",
            date: "2026-04-01",
            available: true,
            price: 90,
            currency: "EUR",
          },
        ],
      });

      expect(result.processed).toBe(1);
      expect(unblockDates).toHaveBeenCalled();
    });
  });
});
