import { NotFoundException } from "@nestjs/common";
import { InventoryClient } from "./inventory.client.js";
import type { CacheService } from "../cache/cache.service.js";
import type { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";

function makeClient({
  cacheGet = jest.fn().mockResolvedValue(null),
  cacheSet = jest.fn().mockResolvedValue(undefined),
  httpGet = jest
    .fn()
    .mockReturnValue(of({ data: { country: "MX", city: "cancún" } })),
}: {
  cacheGet?: jest.Mock;
  cacheSet?: jest.Mock;
  httpGet?: jest.Mock;
} = {}) {
  const cache = { get: cacheGet, set: cacheSet } as unknown as CacheService;
  const httpService = { get: httpGet } as unknown as HttpService;
  return {
    client: new InventoryClient(httpService, cache),
    cacheGet,
    cacheSet,
    httpGet,
  };
}

describe("InventoryClient", () => {
  describe("getRoomLocation", () => {
    it("returns cached value without calling inventory-service on cache hit", async () => {
      const { client, httpGet } = makeClient({
        cacheGet: jest
          .fn()
          .mockResolvedValue(JSON.stringify({ country: "MX", city: "cancún" })),
      });

      const result = await client.getRoomLocation("room-1");

      expect(result).toEqual({ country: "MX", city: "cancún" });
      expect(httpGet).not.toHaveBeenCalled();
    });

    it("calls inventory-service on cache miss, writes to cache, returns location", async () => {
      const cacheSet = jest.fn().mockResolvedValue(undefined);
      const { client, httpGet } = makeClient({ cacheSet });

      const result = await client.getRoomLocation("room-1");

      expect(httpGet).toHaveBeenCalled();
      expect(cacheSet).toHaveBeenCalledWith(
        "booking:room-location:room-1",
        JSON.stringify({ country: "MX", city: "cancún" }),
        expect.any(Number),
      );
      expect(result).toEqual({ country: "MX", city: "cancún" });
    });

    it("propagates NotFoundException when inventory-service returns 404", async () => {
      const { client } = makeClient({
        httpGet: jest
          .fn()
          .mockReturnValue(throwError(() => ({ response: { status: 404 } }))),
      });

      await expect(client.getRoomLocation("missing-room")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("cacheRoomLocation", () => {
    it("writes serialized location to cache with TTL", async () => {
      const cacheSet = jest.fn().mockResolvedValue(undefined);
      const { client } = makeClient({ cacheSet });

      await client.cacheRoomLocation("room-1", {
        country: "CO",
        city: "bogotá",
      });

      expect(cacheSet).toHaveBeenCalledWith(
        "booking:room-location:room-1",
        JSON.stringify({ country: "CO", city: "bogotá" }),
        expect.any(Number),
      );
    });
  });
});
