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
});
