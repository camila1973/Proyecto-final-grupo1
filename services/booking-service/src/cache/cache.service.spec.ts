const mockRedis = {
  ping: jest.fn().mockResolvedValue("PONG"),
  get: jest.fn(),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  disconnect: jest.fn(),
};

jest.mock("ioredis", () => jest.fn(() => mockRedis));

import { CacheService } from "./cache.service.js";

describe("CacheService", () => {
  let service: CacheService;

  beforeEach(async () => {
    jest.clearAllMocks();
    service = new CacheService();
    await service.onModuleInit();
  });

  describe("onModuleInit", () => {
    it("creates a Redis client and pings it", () => {
      expect(mockRedis.ping).toHaveBeenCalled();
    });
  });

  describe("onModuleDestroy", () => {
    it("disconnects the Redis client", () => {
      service.onModuleDestroy();
      expect(mockRedis.disconnect).toHaveBeenCalled();
    });
  });

  describe("get", () => {
    it("returns the cached value for a known key", async () => {
      mockRedis.get.mockResolvedValue("cached-value");

      const result = await service.get("some-key");

      expect(mockRedis.get).toHaveBeenCalledWith("some-key");
      expect(result).toBe("cached-value");
    });

    it("returns null on cache miss", async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get("missing-key");

      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("writes the value with EX TTL", async () => {
      await service.set("my-key", "my-value", 300);

      expect(mockRedis.set).toHaveBeenCalledWith(
        "my-key",
        "my-value",
        "EX",
        300,
      );
    });
  });

  describe("del", () => {
    it("deletes the key from Redis", async () => {
      await service.del("my-key");

      expect(mockRedis.del).toHaveBeenCalledWith("my-key");
    });
  });
});
