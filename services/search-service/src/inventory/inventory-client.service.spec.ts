import { InventoryClientService } from "./inventory-client.service.js";

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof fetch;

describe("InventoryClientService", () => {
  let service: InventoryClientService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.INVENTORY_SERVICE_URL;
    service = new InventoryClientService();
  });

  describe("checkAvailability", () => {
    it("returns only rooms where available is true", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            { roomId: "r1", available: true },
            { roomId: "r2", available: false },
            { roomId: "r3", available: true },
          ]),
      });

      const result = await service.checkAvailability({
        roomIds: ["r1", "r2", "r3"],
        fromDate: "2026-05-01",
        toDate: "2026-05-07",
      });

      expect(result).toEqual([{ roomId: "r1" }, { roomId: "r3" }]);
    });

    it("returns an empty array when no rooms are available", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ roomId: "r1", available: false }]),
      });

      const result = await service.checkAvailability({
        roomIds: ["r1"],
        fromDate: "2026-05-01",
        toDate: "2026-05-07",
      });

      expect(result).toEqual([]);
    });

    it("sends roomIds as a comma-separated query param", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await service.checkAvailability({
        roomIds: ["r1", "r2", "r3"],
        fromDate: "2026-05-01",
        toDate: "2026-05-07",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("roomId=r1%2Cr2%2Cr3"),
      );
    });

    it("throws when response status is not ok", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 });

      await expect(
        service.checkAvailability({
          roomIds: ["r1"],
          fromDate: "2026-05-01",
          toDate: "2026-05-07",
        }),
      ).rejects.toThrow("inventory availability check failed: 503");
    });

    it("uses INVENTORY_SERVICE_URL env var when set", async () => {
      process.env.INVENTORY_SERVICE_URL = "http://inventory:5000";
      service = new InventoryClientService();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await service.checkAvailability({
        roomIds: ["r1"],
        fromDate: "2026-05-01",
        toDate: "2026-05-07",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("http://inventory:5000"),
      );
    });
  });
});
