import { CacheService } from "./cache.service.js";

const mockPipeline = {
  del: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
};

const mockRedis = {
  ping: jest.fn().mockResolvedValue("PONG"),
  get: jest.fn(),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  scan: jest.fn(),
  pipeline: jest.fn().mockReturnValue(mockPipeline),
  disconnect: jest.fn(),
};

jest.mock("ioredis", () => jest.fn().mockImplementation(() => mockRedis));

describe("CacheService", () => {
  let service: CacheService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis.pipeline.mockReturnValue(mockPipeline);
    service = new CacheService();
    await service.onModuleInit();
  });

  it("pings redis on init", () => {
    expect(mockRedis.ping).toHaveBeenCalled();
  });

  it("disconnects on destroy", () => {
    service.onModuleDestroy();
    expect(mockRedis.disconnect).toHaveBeenCalled();
  });

  describe("get", () => {
    it("returns null when key missing", async () => {
      mockRedis.get.mockResolvedValue(null);
      expect(await service.get("key")).toBeNull();
    });

    it("returns cached value", async () => {
      mockRedis.get.mockResolvedValue("value");
      expect(await service.get("key")).toBe("value");
    });
  });

  describe("set", () => {
    it("calls redis set with EX and ttl", async () => {
      await service.set("key", "value", 60);
      expect(mockRedis.set).toHaveBeenCalledWith("key", "value", "EX", 60);
    });
  });

  describe("del", () => {
    it("calls redis del", async () => {
      await service.del("key");
      expect(mockRedis.del).toHaveBeenCalledWith("key");
    });
  });

  describe("scanDel", () => {
    it("does nothing when no keys found in single scan", async () => {
      mockRedis.scan.mockResolvedValue(["0", []]);
      await service.scanDel("prefix:*");
      expect(mockPipeline.del).not.toHaveBeenCalled();
    });

    it("deletes matched keys via pipeline across multiple cursor pages", async () => {
      mockRedis.scan
        .mockResolvedValueOnce(["42", ["key1", "key2"]])
        .mockResolvedValueOnce(["0", ["key3"]]);

      await service.scanDel("prefix:*");

      expect(mockPipeline.del).toHaveBeenCalledTimes(3);
      expect(mockPipeline.del).toHaveBeenCalledWith("key1");
      expect(mockPipeline.del).toHaveBeenCalledWith("key2");
      expect(mockPipeline.del).toHaveBeenCalledWith("key3");
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it("does not call pipeline.exec when cursor returns no keys", async () => {
      mockRedis.scan.mockResolvedValue(["0", []]);
      await service.scanDel("nomatch:*");
      expect(mockPipeline.exec).not.toHaveBeenCalled();
    });
  });
});
