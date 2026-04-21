import { NotFoundException } from "@nestjs/common";
import { RoomLocationCacheService } from "./room-location-cache.service.js";
import type { CacheService } from "../cache/cache.service.js";
import type { InventoryClient } from "./inventory.client.js";

function makeService({
  cacheGet = jest.fn().mockResolvedValue(null),
  cacheSet = jest.fn().mockResolvedValue(undefined),
  inventoryGet = jest.fn().mockResolvedValue({ country: "MX", city: "cancún" }),
}: {
  cacheGet?: jest.Mock;
  cacheSet?: jest.Mock;
  inventoryGet?: jest.Mock;
} = {}) {
  const cache = {
    get: cacheGet,
    set: cacheSet,
  } as unknown as CacheService;

  const inventoryClient = {
    getRoomLocation: inventoryGet,
  } as unknown as InventoryClient;

  return {
    service: new RoomLocationCacheService(cache, inventoryClient),
    cacheGet,
    cacheSet,
    inventoryGet,
  };
}

describe("RoomLocationCacheService", () => {
  describe("findByRoomId", () => {
    it("returns cached value and does not call inventory on cache hit", async () => {
      const { service, inventoryGet } = makeService({
        cacheGet: jest
          .fn()
          .mockResolvedValue(JSON.stringify({ country: "MX", city: "cancún" })),
      });

      const result = await service.findByRoomId("room-1");

      expect(result).toEqual({ country: "MX", city: "cancún" });
      expect(inventoryGet).not.toHaveBeenCalled();
    });

    it("calls inventory on cache miss, writes to cache, returns location", async () => {
      const cacheSet = jest.fn().mockResolvedValue(undefined);
      const { service, inventoryGet } = makeService({ cacheSet });

      const result = await service.findByRoomId("room-1");

      expect(inventoryGet).toHaveBeenCalledWith("room-1");
      expect(cacheSet).toHaveBeenCalledWith(
        "booking:room-location:room-1",
        JSON.stringify({ country: "MX", city: "cancún" }),
        expect.any(Number),
      );
      expect(result).toEqual({ country: "MX", city: "cancún" });
    });

    it("propagates NotFoundException when inventory returns 404", async () => {
      const { service } = makeService({
        inventoryGet: jest
          .fn()
          .mockRejectedValue(new NotFoundException("Room not found")),
      });

      await expect(service.findByRoomId("missing-room")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("upsert", () => {
    it("writes serialized location to cache with TTL", async () => {
      const cacheSet = jest.fn().mockResolvedValue(undefined);
      const { service } = makeService({ cacheSet });

      await service.upsert("room-1", { country: "CO", city: "bogotá" });

      expect(cacheSet).toHaveBeenCalledWith(
        "booking:room-location:room-1",
        JSON.stringify({ country: "CO", city: "bogotá" }),
        expect.any(Number),
      );
    });
  });
});
