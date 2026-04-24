import { NotFoundException } from "@nestjs/common";
import { RoomsService } from "./rooms.service";
import type { RoomsRepository } from "./rooms.repository";
import type { PropertiesService } from "../properties/properties.service";
import type { PropertiesRepository } from "../properties/properties.repository";
import type { EventsPublisher } from "../events/events.publisher";

const NOW = new Date("2026-01-01T00:00:00Z");

const PROPERTY_ROW = {
  id: "prop-1",
  name: "Hotel Sol",
  type: "hotel",
  city: "Cancún",
  stars: 4,
  status: "active",
  country_code: "MX",
  partner_id: "partner-1",
  created_at: NOW,
  updated_at: NOW,
};

const ROOM_ROW = {
  id: "room-1",
  property_id: "prop-1",
  room_type: "double",
  capacity: 2,
  total_rooms: 5,
  base_price_usd: "150.00",
  status: "active",
  created_at: NOW,
  updated_at: NOW,
};

function makeService(
  overrides: Partial<{
    repo: Partial<RoomsRepository>;
    propertiesService: Partial<PropertiesService>;
    propertiesRepo: Partial<PropertiesRepository>;
    events: Partial<EventsPublisher>;
  }> = {},
) {
  const repo = {
    create: jest.fn().mockResolvedValue(ROOM_ROW),
    findByProperty: jest.fn().mockResolvedValue([ROOM_ROW]),
    findById: jest.fn().mockResolvedValue(ROOM_ROW),
    findByPropertyAndType: jest.fn().mockResolvedValue(ROOM_ROW),
    update: jest.fn().mockResolvedValue(ROOM_ROW),
    softDelete: jest.fn().mockResolvedValue(undefined),
    ...overrides.repo,
  } as unknown as RoomsRepository;

  const propertiesService = {
    findOne: jest.fn().mockResolvedValue({
      id: "prop-1",
      partnerId: "partner-1",
      countryCode: "MX",
      city: "Cancún",
    }),
    findByProperty: jest.fn().mockResolvedValue([{ id: "prop-1" }]),
    ...overrides.propertiesService,
  } as unknown as PropertiesService;

  const propertiesRepo = {
    findById: jest.fn().mockResolvedValue(PROPERTY_ROW),
    ...overrides.propertiesRepo,
  } as unknown as PropertiesRepository;

  const events = {
    publish: jest.fn(),
    ...overrides.events,
  } as unknown as EventsPublisher;

  return new RoomsService(repo, propertiesService, propertiesRepo, events);
}

describe("RoomsService", () => {
  describe("create", () => {
    it("creates a room and publishes an event", async () => {
      const publish = jest.fn();
      const service = makeService({ events: { publish } });
      const result = await service.create("prop-1", "partner-1", {
        propertyId: "prop-1",
        roomType: "double",
        capacity: 2,
        totalRooms: 5,
        basePriceUsd: 150,
      });
      expect(result.id).toBe("room-1");
      expect(publish).toHaveBeenCalledWith(
        "inventory.room.upserted",
        expect.objectContaining({ routingKey: "inventory.room.upserted" }),
      );
    });

    it("does not publish if property is not found for snapshot", async () => {
      const publish = jest.fn();
      const service = makeService({
        propertiesRepo: { findById: jest.fn().mockResolvedValue(undefined) },
        events: { publish },
      });
      await service.create("prop-1", "partner-1", {
        propertyId: "prop-1",
        roomType: "double",
        capacity: 2,
        totalRooms: 5,
        basePriceUsd: 150,
      });
      expect(publish).not.toHaveBeenCalled();
    });
  });

  describe("findByProperty", () => {
    it("returns rooms for a given property", async () => {
      const service = makeService();
      const result = await service.findByProperty("prop-1");
      expect(result).toHaveLength(1);
      expect(result[0].propertyId).toBe("prop-1");
    });
  });

  describe("findOne", () => {
    it("returns the room when found", async () => {
      const service = makeService();
      const result = await service.findOne("room-1");
      expect(result.id).toBe("room-1");
    });

    it("throws NotFoundException when room does not exist", async () => {
      const service = makeService({
        repo: { findById: jest.fn().mockResolvedValue(undefined) },
      });
      await expect(service.findOne("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findOneRaw", () => {
    it("returns the raw room row", async () => {
      const service = makeService();
      const result = await service.findOneRaw("room-1");
      expect(result?.id).toBe("room-1");
    });
  });

  describe("update", () => {
    it("updates and returns the room", async () => {
      const updated = { ...ROOM_ROW, capacity: 3 };
      const service = makeService({
        repo: { update: jest.fn().mockResolvedValue(updated) },
      });
      const result = await service.update("room-1", "partner-1", {
        capacity: 3,
      });
      expect(result.capacity).toBe(3);
    });

    it("throws NotFoundException if repo returns undefined after update", async () => {
      const service = makeService({
        repo: { update: jest.fn().mockResolvedValue(undefined) },
      });
      await expect(
        service.update("room-1", "partner-1", { capacity: 3 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("publishes event after successful update", async () => {
      const publish = jest.fn();
      const service = makeService({ events: { publish } });
      await service.update("room-1", "partner-1", { capacity: 3 });
      expect(publish).toHaveBeenCalledWith(
        "inventory.room.upserted",
        expect.anything(),
      );
    });
  });

  describe("update - basePriceUsd branch", () => {
    it("passes undefined for base_price_usd when basePriceUsd is not provided", async () => {
      const repoUpdate = jest.fn().mockResolvedValue(ROOM_ROW);
      const service = makeService({ repo: { update: repoUpdate } });
      await service.update("room-1", "partner-1", {}); // no basePriceUsd
      expect(repoUpdate).toHaveBeenCalledWith(
        "room-1",
        expect.objectContaining({ base_price_usd: undefined }),
      );
    });
  });

  describe("remove", () => {
    it("soft-deletes the room and publishes deleted event", async () => {
      const publish = jest.fn();
      const softDelete = jest.fn().mockResolvedValue(undefined);
      const service = makeService({
        repo: { softDelete },
        events: { publish },
      });
      await service.remove("room-1");
      expect(softDelete).toHaveBeenCalledWith("room-1");
      expect(publish).toHaveBeenCalledWith(
        "inventory.room.deleted",
        expect.objectContaining({ roomId: "room-1" }),
      );
    });
  });
});
