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
  created_at: NOW,
  updated_at: NOW,
};

function makeService(overrides: Partial<PropertiesRepository> = {}) {
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
  const events = { publish: jest.fn() } as any;
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
});
