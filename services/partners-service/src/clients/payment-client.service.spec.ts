import { PaymentClientService } from "./payment-client.service.js";

function mockFetch(ok: boolean, body: unknown, status = 200) {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("PaymentClientService", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("getCapturedByPartner", () => {
    it("returns the JSON body on success", async () => {
      const payload = {
        partnerId: "p-1",
        from: "2026-03-01",
        to: "2026-04-01",
        currency: "USD",
        totals: {
          grossUsd: 100,
          taxUsd: 19,
          commissionUsd: 20,
          netUsd: 80,
          count: 1,
        },
        rows: [],
      };
      global.fetch = mockFetch(true, payload) as typeof fetch;
      const svc = new PaymentClientService();

      const result = await svc.getCapturedByPartner(
        "p-1",
        "2026-03-01",
        "2026-04-01",
      );

      expect(result).toEqual(payload);
      const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
      expect(url).toContain("/payments/by-partner/p-1/captured");
      expect(url).toContain("from=2026-03-01");
      expect(url).toContain("to=2026-04-01");
    });

    it("includes propertyId when provided", async () => {
      global.fetch = mockFetch(true, {}) as typeof fetch;
      const svc = new PaymentClientService();

      await svc.getCapturedByPartner(
        "p-1",
        "2026-03-01",
        "2026-04-01",
        "prop-A",
      );
      const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
      expect(url).toContain("propertyId=prop-A");
    });

    it("returns null when payment-service responds non-ok", async () => {
      global.fetch = mockFetch(false, "", 500) as typeof fetch;
      const svc = new PaymentClientService();

      expect(
        await svc.getCapturedByPartner("p-1", "2026-03-01", "2026-04-01"),
      ).toBeNull();
    });
  });

  describe("getDisbursementHistory", () => {
    it("returns the JSON body on success", async () => {
      const payload = {
        partnerId: "p-1",
        from: "2026-03-01",
        to: "2026-04-01",
        currency: "USD",
        totals: { gross: 100, tax: 19, partnerFee: 5, commission: 20, net: 80 },
        paymentCount: 1,
        months: [],
      };
      global.fetch = mockFetch(true, payload) as typeof fetch;
      const svc = new PaymentClientService();

      const result = await svc.getDisbursementHistory(
        "p-1",
        "2026-03-01",
        "2026-04-01",
      );

      expect(result).toEqual(payload);
      const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
      expect(url).toContain("/disbursements/by-partner/p-1/history");
    });

    it("returns null when payment-service responds non-ok", async () => {
      global.fetch = mockFetch(false, "", 500) as typeof fetch;
      const svc = new PaymentClientService();

      expect(
        await svc.getDisbursementHistory("p-1", "2026-03-01", "2026-04-01"),
      ).toBeNull();
    });
  });
});
