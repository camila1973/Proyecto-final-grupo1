import { ConflictException, NotFoundException } from "@nestjs/common";
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
  httpPost = jest.fn().mockReturnValue(of({ data: undefined, status: 204 })),
}: {
  cacheGet?: jest.Mock;
  cacheSet?: jest.Mock;
  httpGet?: jest.Mock;
  httpPost?: jest.Mock;
} = {}) {
  const cache = { get: cacheGet, set: cacheSet } as unknown as CacheService;
  const httpService = {
    get: httpGet,
    post: httpPost,
  } as unknown as HttpService;
  return {
    client: new InventoryClient(httpService, cache),
    cacheGet,
    cacheSet,
    httpGet,
    httpPost,
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

  describe("hold / unhold / confirmHold / release", () => {
    const ROOM = "room-1";
    const FROM = "2026-05-01";
    const TO = "2026-05-04";

    it("hold POSTs to /availability/hold with correct body", async () => {
      const { client, httpPost } = makeClient();

      await client.hold(ROOM, FROM, TO);

      expect(httpPost).toHaveBeenCalledWith(
        expect.stringContaining("/availability/hold"),
        { roomId: ROOM, fromDate: FROM, toDate: TO },
      );
    });

    it("hold throws ConflictException when inventory returns 409", async () => {
      const { client } = makeClient({
        httpPost: jest
          .fn()
          .mockReturnValue(
            throwError(() => ({ response: { status: 409, data: {} } })),
          ),
      });

      await expect(client.hold(ROOM, FROM, TO)).rejects.toThrow(
        ConflictException,
      );
    });

    it("unhold POSTs to /availability/unhold", async () => {
      const { client, httpPost } = makeClient();

      await client.unhold(ROOM, FROM, TO);

      expect(httpPost).toHaveBeenCalledWith(
        expect.stringContaining("/availability/unhold"),
        { roomId: ROOM, fromDate: FROM, toDate: TO },
      );
    });

    it("confirmHold POSTs to /availability/confirm", async () => {
      const { client, httpPost } = makeClient();

      await client.confirmHold(ROOM, FROM, TO);

      expect(httpPost).toHaveBeenCalledWith(
        expect.stringContaining("/availability/confirm"),
        { roomId: ROOM, fromDate: FROM, toDate: TO },
      );
    });

    it("release POSTs to /availability/release", async () => {
      const { client, httpPost } = makeClient();

      await client.release(ROOM, FROM, TO);

      expect(httpPost).toHaveBeenCalledWith(
        expect.stringContaining("/availability/release"),
        { roomId: ROOM, fromDate: FROM, toDate: TO },
      );
    });

    it("throws UpstreamServiceError on 500 from any availability mutation", async () => {
      const { client } = makeClient({
        httpPost: jest.fn().mockReturnValue(
          throwError(() => ({
            response: { status: 500 },
            message: "Internal Server Error",
          })),
        ),
      });

      await expect(client.hold(ROOM, FROM, TO)).rejects.toThrow(
        "Upstream service error: inventory-service",
      );
    });
  });
});
