const mockRedis = {
  ping: jest.fn().mockResolvedValue("PONG"),
  get: jest.fn(),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  getdel: jest.fn(),
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

  describe("setIfAbsent", () => {
    it("returns true and writes value when key does not exist", async () => {
      mockRedis.set.mockResolvedValue("OK");

      const result = await service.setIfAbsent("my-key", "my-value", 300);

      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "my-key",
        "my-value",
        "EX",
        300,
        "NX",
      );
    });

    it("returns false when key already exists", async () => {
      mockRedis.set.mockResolvedValue(null);

      const result = await service.setIfAbsent("my-key", "my-value", 300);

      expect(result).toBe(false);
    });
  });

  describe("getAndDelete", () => {
    it("returns the value and deletes the key atomically", async () => {
      mockRedis.getdel.mockResolvedValue("stored-value");

      const result = await service.getAndDelete("my-key");

      expect(mockRedis.getdel).toHaveBeenCalledWith("my-key");
      expect(result).toBe("stored-value");
    });

    it("returns null when key does not exist", async () => {
      mockRedis.getdel.mockResolvedValue(null);

      const result = await service.getAndDelete("missing-key");

      expect(result).toBeNull();
    });
  });
});
