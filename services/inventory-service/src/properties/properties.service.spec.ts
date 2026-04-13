import { NotFoundException } from "@nestjs/common";
import { PropertiesService } from "./properties.service";
import type { PropertiesRepository } from "./properties.repository";

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
  neighborhood: "Centro",
  lat: 21.1,
  lon: -86.8,
  rating: "4.5",
  review_count: 120,
  thumbnail_url: "https://example.com/thumb.jpg",
  amenities: ["wifi", "pool"],
  created_at: NOW,
  updated_at: NOW,
};

const ROOM_ROW = {
  id: "room-1",
  property_id: "prop-1",
  room_type: "double",
  bed_type: "queen",
  view_type: "ocean",
  capacity: 2,
  total_rooms: 5,
  base_price_usd: "150.00",
  status: "active",
  created_at: NOW,
  updated_at: NOW,
};

function makeService(
  overrides: Partial<PropertiesRepository> = {},
  eventsOverrides: any = {},
) {
  const repo = {
    create: jest.fn().mockResolvedValue(PROPERTY_ROW),
    findAll: jest.fn().mockResolvedValue([PROPERTY_ROW]),
    findById: jest.fn().mockResolvedValue(PROPERTY_ROW),
    findByIdWithRooms: jest
      .fn()
      .mockResolvedValue({ property: PROPERTY_ROW, rooms: [] }),
    findByName: jest.fn().mockResolvedValue(PROPERTY_ROW),
    update: jest.fn().mockResolvedValue(PROPERTY_ROW),
    softDelete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as PropertiesRepository;
  const events = { publish: jest.fn(), ...eventsOverrides };
  return new PropertiesService(repo, events);
}

describe("PropertiesService", () => {
  describe("create", () => {
    it("creates a property and returns the public shape", async () => {
      const service = makeService();
      const result = await service.create("partner-1", {
        partnerId: "partner-1",
        name: "Hotel Sol",
        type: "hotel",
        city: "Cancún",
        stars: 4,
        countryCode: "MX",
      });
      expect(result.id).toBe("prop-1");
      expect(result.partnerId).toBe("partner-1");
      expect(result.countryCode).toBe("MX");
    });
  });

  describe("findAll", () => {
    it("returns mapped public properties", async () => {
      const service = makeService();
      const result = await service.findAll("partner-1", "Cancún", "active");
      expect(result).toHaveLength(1);
      expect(result[0].city).toBe("Cancún");
    });

    it("returns empty array when repo returns nothing", async () => {
      const service = makeService({ findAll: jest.fn().mockResolvedValue([]) });
      const result = await service.findAll("partner-1");
      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("returns the property when found", async () => {
      const service = makeService();
      const result = await service.findOne("prop-1");
      expect(result.id).toBe("prop-1");
    });

    it("throws NotFoundException when property does not exist", async () => {
      const service = makeService({
        findById: jest.fn().mockResolvedValue(undefined),
      });
      await expect(service.findOne("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("updates and returns the updated property", async () => {
      const updated = { ...PROPERTY_ROW, city: "CDMX" };
      const service = makeService({
        update: jest.fn().mockResolvedValue(updated),
      });
      const result = await service.update("prop-1", { city: "CDMX" });
      expect(result.city).toBe("CDMX");
    });

    it("throws NotFoundException if repo returns undefined after update", async () => {
      const service = makeService({
        update: jest.fn().mockResolvedValue(undefined),
      });
      await expect(service.update("prop-1", { city: "CDMX" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("soft-deletes the property", async () => {
      const softDelete = jest.fn().mockResolvedValue(undefined);
      const service = makeService({ softDelete });
      await service.remove("prop-1");
      expect(softDelete).toHaveBeenCalledWith("prop-1");
    });
  });

  describe("findDetail", () => {
    it("returns null when property is not found", async () => {
      const service = makeService({
        findByIdWithRooms: jest.fn().mockResolvedValue(undefined),
      });
      const result = await service.findDetail("missing");
      expect(result).toBeNull();
    });

    it("returns property with rooms when found", async () => {
      const service = makeService({
        findByIdWithRooms: jest
          .fn()
          .mockResolvedValue({ property: PROPERTY_ROW, rooms: [ROOM_ROW] }),
      });
      const result = await service.findDetail("prop-1");
      expect(result?.id).toBe("prop-1");
      expect(result?.rooms).toHaveLength(1);
      expect(result?.rooms?.[0].roomId).toBe("room-1");
    });

    it("returns property with empty rooms array when property has no rooms", async () => {
      const service = makeService({
        findByIdWithRooms: jest
          .fn()
          .mockResolvedValue({ property: PROPERTY_ROW, rooms: [] }),
      });
      const result = await service.findDetail("prop-1");
      expect(result?.rooms).toEqual([]);
    });
  });

  describe("update publishes events for each room", () => {
    it("publishes inventory.room.upserted for each active room after update", async () => {
      const publish = jest.fn();
      const service = makeService(
        {
          findByIdWithRooms: jest
            .fn()
            .mockResolvedValue({ property: PROPERTY_ROW, rooms: [ROOM_ROW] }),
        },
        { publish },
      );
      await service.update("prop-1", { city: "CDMX" });
      expect(publish).toHaveBeenCalledWith(
        "inventory.room.upserted",
        expect.objectContaining({ routingKey: "inventory.room.upserted" }),
      );
    });

    it("does not publish events when property has no rooms", async () => {
      const publish = jest.fn();
      const service = makeService(
        {
          findByIdWithRooms: jest
            .fn()
            .mockResolvedValue({ property: PROPERTY_ROW, rooms: [] }),
        },
        { publish },
      );
      await service.update("prop-1", { city: "CDMX" });
      expect(publish).not.toHaveBeenCalled();
    });

    it("does not publish events when findByIdWithRooms returns undefined", async () => {
      const publish = jest.fn();
      const service = makeService(
        {
          findByIdWithRooms: jest.fn().mockResolvedValue(undefined),
        },
        { publish },
      );
      await service.update("prop-1", { city: "CDMX" });
      expect(publish).not.toHaveBeenCalled();
    });
  });
});
