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

  describe("getRateForStay", () => {
    it("returns the per-night rate for a single period covering the full stay", async () => {
      const { client } = makeClient({
        httpGet: jest.fn().mockReturnValue(
          of({
            data: [
              { fromDate: "2026-05-01", toDate: "2026-05-04", priceUsd: "150" },
            ],
          }),
        ),
      });

      const result = await client.getRateForStay(
        "prop-1",
        "room-1",
        new Date("2026-05-01"),
        new Date("2026-05-04"),
      );

      expect(result).toBe(150);
    });

    it("returns the weighted average rate across multiple periods", async () => {
      const { client } = makeClient({
        httpGet: jest.fn().mockReturnValue(
          of({
            data: [
              { fromDate: "2026-05-01", toDate: "2026-05-03", priceUsd: "100" },
              { fromDate: "2026-05-03", toDate: "2026-05-05", priceUsd: "200" },
            ],
          }),
        ),
      });

      // 2 nights × $100 + 2 nights × $200 = $600 / 4 nights = $150/night
      const result = await client.getRateForStay(
        "prop-1",
        "room-1",
        new Date("2026-05-01"),
        new Date("2026-05-05"),
      );

      expect(result).toBe(150);
    });

    it("throws NotFoundException when no rate periods are returned", async () => {
      const { client } = makeClient({
        httpGet: jest.fn().mockReturnValue(of({ data: [] })),
      });

      await expect(
        client.getRateForStay(
          "prop-1",
          "room-1",
          new Date("2026-05-01"),
          new Date("2026-05-04"),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when periods leave a gap in the middle", async () => {
      const { client } = makeClient({
        httpGet: jest.fn().mockReturnValue(
          of({
            data: [
              { fromDate: "2026-05-01", toDate: "2026-05-02", priceUsd: "100" },
              // gap: 2026-05-02 to 2026-05-03 not covered
              { fromDate: "2026-05-03", toDate: "2026-05-04", priceUsd: "200" },
            ],
          }),
        ),
      });

      await expect(
        client.getRateForStay(
          "prop-1",
          "room-1",
          new Date("2026-05-01"),
          new Date("2026-05-04"),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when periods do not reach the checkout date", async () => {
      const { client } = makeClient({
        httpGet: jest.fn().mockReturnValue(
          of({
            data: [
              { fromDate: "2026-05-01", toDate: "2026-05-03", priceUsd: "150" },
            ],
          }),
        ),
      });

      await expect(
        client.getRateForStay(
          "prop-1",
          "room-1",
          new Date("2026-05-01"),
          new Date("2026-05-04"),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws UpstreamServiceError on non-404 HTTP errors", async () => {
      const { client } = makeClient({
        httpGet: jest.fn().mockReturnValue(
          throwError(() => ({
            response: { status: 500 },
            message: "Internal Server Error",
          })),
        ),
      });

      await expect(
        client.getRateForStay(
          "prop-1",
          "room-1",
          new Date("2026-05-01"),
          new Date("2026-05-04"),
        ),
      ).rejects.toThrow("Upstream service error: inventory-service");
    });
  });
});
