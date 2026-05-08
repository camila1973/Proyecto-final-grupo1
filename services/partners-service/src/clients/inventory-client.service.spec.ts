import { InventoryClientService } from "./inventory-client.service.js";

function mockFetch(ok: boolean, body: unknown, status = 200) {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

const PROPERTY = {
  id: "prop-1",
  name: "Hotel Central",
  type: "hotel",
  city: "Bogotá",
  countryCode: "CO",
  neighborhood: null,
  stars: 4,
  status: "active",
  partnerId: "partner-1",
  thumbnailUrl: "",
  createdAt: "2026-01-01",
};

describe("InventoryClientService", () => {
  let svc: InventoryClientService;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    svc = new InventoryClientService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("listPropertiesByPartner", () => {
    it("returns array when response is an array", async () => {
      global.fetch = mockFetch(true, [PROPERTY]) as typeof fetch;
      const result = await svc.listPropertiesByPartner("partner-1");
      expect(result).toEqual([PROPERTY]);
    });

    it("returns properties field when response is an object with properties key", async () => {
      global.fetch = mockFetch(true, {
        properties: [PROPERTY],
      }) as typeof fetch;
      const result = await svc.listPropertiesByPartner("partner-1");
      expect(result).toEqual([PROPERTY]);
    });

    it("returns empty array when response object has no properties key", async () => {
      global.fetch = mockFetch(true, {}) as typeof fetch;
      const result = await svc.listPropertiesByPartner("partner-1");
      expect(result).toEqual([]);
    });

    it("returns empty array and logs warning on non-ok response", async () => {
      global.fetch = mockFetch(false, "Error", 500) as typeof fetch;
      const result = await svc.listPropertiesByPartner("partner-1");
      expect(result).toEqual([]);
    });

    it("includes partnerId as query parameter", async () => {
      global.fetch = mockFetch(true, []) as typeof fetch;
      await svc.listPropertiesByPartner("partner-uuid-1");
      const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
      expect(url).toContain("partnerId=partner-uuid-1");
    });
  });

  describe("listRoomsByProperty", () => {
    const ROOM = {
      id: "room-1",
      propertyId: "prop-1",
      roomType: "deluxe",
      bedType: "king",
      viewType: "ocean",
      capacity: 2,
      totalRooms: 5,
      basePriceUsd: "120",
      status: "active",
    };

    it("unwraps an object with rooms key", async () => {
      global.fetch = mockFetch(true, { rooms: [ROOM] }) as typeof fetch;
      expect(await svc.listRoomsByProperty("prop-1")).toEqual([ROOM]);
    });

    it("returns array as-is", async () => {
      global.fetch = mockFetch(true, [ROOM]) as typeof fetch;
      expect(await svc.listRoomsByProperty("prop-1")).toEqual([ROOM]);
    });

    it("returns [] on non-ok response", async () => {
      global.fetch = mockFetch(false, "", 500) as typeof fetch;
      expect(await svc.listRoomsByProperty("prop-1")).toEqual([]);
    });
  });

  describe("getRoomById", () => {
    it("returns room on 200", async () => {
      const room = { id: "room-1" };
      global.fetch = mockFetch(true, room) as typeof fetch;
      expect(await svc.getRoomById("room-1")).toEqual(room);
    });

    it("returns null on 404", async () => {
      global.fetch = mockFetch(false, "", 404) as typeof fetch;
      expect(await svc.getRoomById("missing")).toBeNull();
    });

    it("returns null on other non-ok", async () => {
      global.fetch = mockFetch(false, "", 500) as typeof fetch;
      expect(await svc.getRoomById("room-1")).toBeNull();
    });
  });

  describe("getRoomAvailability", () => {
    const DAY = {
      date: "2026-05-01",
      totalRooms: 5,
      reservedRooms: 1,
      heldRooms: 0,
      blocked: false,
      available: true,
    };

    it("unwraps days field", async () => {
      global.fetch = mockFetch(true, { days: [DAY] }) as typeof fetch;
      const result = await svc.getRoomAvailability(
        "room-1",
        "2026-05-01",
        "2026-05-31",
      );
      expect(result).toEqual([DAY]);
    });

    it("returns array as-is", async () => {
      global.fetch = mockFetch(true, [DAY]) as typeof fetch;
      expect(
        await svc.getRoomAvailability("room-1", "2026-05-01", "2026-05-31"),
      ).toEqual([DAY]);
    });

    it("returns [] on non-ok", async () => {
      global.fetch = mockFetch(false, "", 500) as typeof fetch;
      expect(
        await svc.getRoomAvailability("room-1", "2026-05-01", "2026-05-31"),
      ).toEqual([]);
    });
  });

  describe("getRoomRates", () => {
    const RATE = {
      id: "rate-1",
      roomId: "room-1",
      fromDate: "2026-05-01",
      toDate: "2026-05-31",
      priceUsd: "120",
      currency: "USD",
      createdAt: "2026-01-01",
    };

    it("unwraps rates field", async () => {
      global.fetch = mockFetch(true, { rates: [RATE] }) as typeof fetch;
      const result = await svc.getRoomRates(
        "room-1",
        "prop-1",
        "2026-05-01",
        "2026-05-31",
      );
      expect(result).toEqual([RATE]);
    });

    it("returns [] on non-ok", async () => {
      global.fetch = mockFetch(false, "", 500) as typeof fetch;
      expect(
        await svc.getRoomRates("room-1", "prop-1", "2026-05-01", "2026-05-31"),
      ).toEqual([]);
    });
  });

  describe("blockRoomDates / unblockRoomDates", () => {
    it("posts JSON body to /availability/block", async () => {
      global.fetch = mockFetch(true, {}) as typeof fetch;
      await svc.blockRoomDates("room-1", "2026-05-01", "2026-05-05");
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect(url).toContain("/availability/block");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        roomId: "room-1",
        fromDate: "2026-05-01",
        toDate: "2026-05-05",
      });
    });

    it("does not throw when block returns non-ok", async () => {
      global.fetch = mockFetch(false, "", 500) as typeof fetch;
      await expect(
        svc.blockRoomDates("room-1", "2026-05-01", "2026-05-05"),
      ).resolves.toBeUndefined();
    });

    it("posts to /availability/unblock", async () => {
      global.fetch = mockFetch(true, {}) as typeof fetch;
      await svc.unblockRoomDates("room-1", "2026-05-01", "2026-05-05");
      const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
      expect(url).toContain("/availability/unblock");
    });

    it("does not throw when unblock returns non-ok", async () => {
      global.fetch = mockFetch(false, "", 500) as typeof fetch;
      await expect(
        svc.unblockRoomDates("room-1", "2026-05-01", "2026-05-05"),
      ).resolves.toBeUndefined();
    });
  });

  describe("createRoomRate", () => {
    it("returns the created rate on success", async () => {
      const rate = {
        id: "rate-1",
        roomId: "room-1",
        fromDate: "2026-05-01",
        toDate: "2026-05-31",
        priceUsd: "150",
        currency: "USD",
        createdAt: "2026-05-01",
      };
      global.fetch = mockFetch(true, rate) as typeof fetch;
      const result = await svc.createRoomRate(
        "room-1",
        "2026-05-01",
        "2026-05-31",
        150,
      );
      expect(result).toEqual(rate);
    });

    it("returns null on non-ok response", async () => {
      global.fetch = mockFetch(false, "", 500) as typeof fetch;
      const result = await svc.createRoomRate(
        "room-1",
        "2026-05-01",
        "2026-05-31",
        150,
      );
      expect(result).toBeNull();
    });
  });

  describe("getPropertyById", () => {
    it("returns property on 200", async () => {
      global.fetch = mockFetch(true, PROPERTY) as typeof fetch;
      expect(await svc.getPropertyById("prop-1")).toEqual(PROPERTY);
    });

    it("returns null on 404", async () => {
      global.fetch = mockFetch(false, "", 404) as typeof fetch;
      expect(await svc.getPropertyById("missing")).toBeNull();
    });

    it("returns null on other non-ok", async () => {
      global.fetch = mockFetch(false, "", 500) as typeof fetch;
      expect(await svc.getPropertyById("prop-1")).toBeNull();
    });
  });
});
