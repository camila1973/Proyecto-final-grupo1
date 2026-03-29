import { NotFoundException } from "@nestjs/common";
import { RoomRatesService } from "./room-rates.service";
import type { RoomRatesRepository } from "./room-rates.repository";
import type { RoomsService } from "../rooms/rooms.service";
import type { EventsPublisher } from "../events/events.publisher";

const NOW = new Date("2026-01-01T00:00:00Z");

const RATE_ROW = {
  id: "rate-1",
  room_id: "room-1",
  from_date: "2026-04-01",
  to_date: "2026-04-10",
  price_usd: "150.00",
  currency: "USD",
  created_at: NOW,
};

const PUBLIC_ROOM = {
  id: "room-1",
  propertyId: "prop-1",
  roomType: "double",
  capacity: 2,
  totalRooms: 5,
  basePriceUsd: "150.00",
  status: "active",
  createdAt: NOW,
  updatedAt: NOW,
};

function makeService(
  overrides: Partial<{
    repo: Partial<RoomRatesRepository>;
    roomsService: Partial<RoomsService>;
    events: Partial<EventsPublisher>;
  }> = {},
) {
  const repo = {
    create: jest.fn().mockResolvedValue(RATE_ROW),
    findByRoom: jest.fn().mockResolvedValue([RATE_ROW]),
    findById: jest.fn().mockResolvedValue(RATE_ROW),
    findOverlapping: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteMany: jest.fn().mockResolvedValue(undefined),
    ...overrides.repo,
  } as unknown as RoomRatesRepository;

  const roomsService = {
    findOne: jest.fn().mockResolvedValue(PUBLIC_ROOM),
    findByProperty: jest.fn().mockResolvedValue([PUBLIC_ROOM]),
    ...overrides.roomsService,
  } as unknown as RoomsService;

  const events = {
    publish: jest.fn(),
    ...overrides.events,
  } as unknown as EventsPublisher;

  return new RoomRatesService(repo, roomsService, events);
}

describe("RoomRatesService", () => {
  describe("create", () => {
    it("creates a rate and publishes a price.updated event", async () => {
      const publish = jest.fn();
      const service = makeService({ events: { publish } });
      const result = await service.create("room-1", "partner-1", {
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-10",
        priceUsd: 150,
        currency: "USD",
      });
      expect(result.id).toBe("rate-1");
      expect(publish).toHaveBeenCalledWith(
        "price.updated",
        expect.objectContaining({ roomId: "room-1", priceUsd: 150 }),
      );
    });

    it("splits overlapping rates before inserting", async () => {
      const overlapping = [
        {
          id: "old-rate",
          room_id: "room-1",
          from_date: "2026-03-28",
          to_date: "2026-04-05",
          price_usd: "120.00",
          currency: "USD",
        },
      ];
      const findOverlapping = jest.fn().mockResolvedValue(overlapping);
      const deleteMany = jest.fn().mockResolvedValue(undefined);
      const create = jest.fn().mockResolvedValue(RATE_ROW);
      const service = makeService({
        repo: {
          findOverlapping,
          deleteMany,
          create,
          findById: jest.fn().mockResolvedValue(RATE_ROW),
          delete: jest.fn(),
        },
      });

      await service.create("room-1", "partner-1", {
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-10",
        priceUsd: 150,
      });

      expect(deleteMany).toHaveBeenCalledWith(["old-rate"]);
      // A left-segment should have been created for 2026-03-28 → 2026-04-01
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          from_date: "2026-03-28",
          to_date: "2026-04-01",
        }),
      );
    });

    it("handles Date objects in from_date/to_date (toDateString Date branch)", async () => {
      const overlapping = [
        {
          id: "old-rate",
          room_id: "room-1",
          from_date: new Date("2026-03-28T00:00:00Z"),
          to_date: new Date("2026-04-05T00:00:00Z"),
          price_usd: "120.00",
          currency: "USD",
        },
      ];
      const findOverlapping = jest.fn().mockResolvedValue(overlapping);
      const deleteMany = jest.fn().mockResolvedValue(undefined);
      const create = jest.fn().mockResolvedValue(RATE_ROW);
      const service = makeService({
        repo: {
          findOverlapping,
          deleteMany,
          create,
          findById: jest.fn().mockResolvedValue(RATE_ROW),
          delete: jest.fn(),
        },
      });

      await service.create("room-1", "partner-1", {
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-10",
        priceUsd: 150,
      });

      // Left segment should be created for 2026-03-28 → 2026-04-01
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          from_date: "2026-03-28",
          to_date: "2026-04-01",
        }),
      );
    });

    it("creates a right-segment when overlap extends past toDate", async () => {
      const overlapping = [
        {
          id: "old-rate",
          room_id: "room-1",
          from_date: "2026-04-05",
          to_date: "2026-04-15",
          price_usd: "120.00",
          currency: "USD",
        },
      ];
      const findOverlapping = jest.fn().mockResolvedValue(overlapping);
      const deleteMany = jest.fn().mockResolvedValue(undefined);
      const create = jest.fn().mockResolvedValue(RATE_ROW);
      const service = makeService({
        repo: {
          findOverlapping,
          deleteMany,
          create,
          findById: jest.fn().mockResolvedValue(RATE_ROW),
          delete: jest.fn(),
        },
      });

      await service.create("room-1", "partner-1", {
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-10",
        priceUsd: 150,
      });

      // A right-segment should be created for 2026-04-10 → 2026-04-15
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          from_date: "2026-04-10",
          to_date: "2026-04-15",
        }),
      );
    });
  });

  describe("findByRoom", () => {
    it("returns rates for a given room", async () => {
      const service = makeService();
      const result = await service.findByRoom("room-1", "partner-1");
      expect(result).toHaveLength(1);
      expect(result[0].roomId).toBe("room-1");
    });
  });

  describe("findByProperty", () => {
    it("fans out to all rooms and returns combined rates", async () => {
      const service = makeService();
      const result = await service.findByProperty("prop-1", "partner-1");
      expect(result).toHaveLength(1);
    });
  });

  describe("replace", () => {
    it("deletes the old rate and creates a new one", async () => {
      const del = jest.fn().mockResolvedValue(undefined);
      const create = jest.fn().mockResolvedValue(RATE_ROW);
      const service = makeService({
        repo: {
          delete: del,
          create,
          findOverlapping: jest.fn().mockResolvedValue([]),
        },
      });
      const result = await service.replace("rate-1", "partner-1", {
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-10",
        priceUsd: 200,
      });
      expect(del).toHaveBeenCalledWith("rate-1");
      expect(result.id).toBe("rate-1");
    });

    it("throws NotFoundException when rate does not exist", async () => {
      const service = makeService({
        repo: { findById: jest.fn().mockResolvedValue(undefined) },
      });
      await expect(
        service.replace("missing", "partner-1", {
          roomId: "room-1",
          fromDate: "2026-04-01",
          toDate: "2026-04-10",
          priceUsd: 200,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("deletes the rate", async () => {
      const del = jest.fn().mockResolvedValue(undefined);
      const service = makeService({ repo: { delete: del } });
      await service.remove("rate-1", "partner-1");
      expect(del).toHaveBeenCalledWith("rate-1");
    });

    it("throws NotFoundException when rate does not exist", async () => {
      const service = makeService({
        repo: { findById: jest.fn().mockResolvedValue(undefined) },
      });
      await expect(service.remove("missing", "partner-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
