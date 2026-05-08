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

  it("returns null on 404", async () => {
    global.fetch = mockFetch(false, "", 404) as typeof fetch;
    const svc = new PaymentClientService();
    expect(await svc.getStatus("r1")).toBeNull();
  });

  it("returns null on other non-ok response", async () => {
    global.fetch = mockFetch(false, "", 500) as typeof fetch;
    const svc = new PaymentClientService();
    expect(await svc.getStatus("r1")).toBeNull();
  });

  it("normalizes a successful payment response", async () => {
    global.fetch = mockFetch(true, {
      id: "pay-1",
      status: "captured",
      amountUsd: 200,
      currency: "USD",
      stripePaymentIntentId: "pi_123",
      guestEmail: "g@example.com",
      createdAt: "2026-03-01T00:00:00Z",
    }) as typeof fetch;
    const svc = new PaymentClientService();
    const result = await svc.getStatus("r1");
    expect(result).toEqual({
      id: "pay-1",
      reservationId: "r1",
      status: "captured",
      amountUsd: 200,
      currency: "USD",
      stripePaymentIntentId: "pi_123",
      guestEmail: "g@example.com",
      createdAt: "2026-03-01T00:00:00Z",
      partnerId: null,
      propertyId: null,
      propertyName: null,
      grossAmountUsd: null,
      taxAmountUsd: null,
      partnerFeeUsd: null,
      commissionRate: null,
      commissionAmountUsd: null,
      netPayoutUsd: null,
      capturedAt: null,
    });
  });

  it("passes through breakdown fields when present", async () => {
    global.fetch = mockFetch(true, {
      id: "pay-2",
      status: "captured",
      amountUsd: 100,
      currency: "USD",
      stripePaymentIntentId: "pi_xyz",
      guestEmail: "g@example.com",
      createdAt: "2026-03-01T00:00:00Z",
      partnerId: "p-1",
      propertyId: "prop-A",
      propertyName: "Hotel A",
      grossAmountUsd: 100,
      taxAmountUsd: 19,
      partnerFeeUsd: 5,
      commissionRate: 0.2,
      commissionAmountUsd: 20,
      netPayoutUsd: 80,
      capturedAt: "2026-03-02T00:00:00Z",
    }) as typeof fetch;
    const svc = new PaymentClientService();
    const result = await svc.getStatus("r2");
    expect(result).toMatchObject({
      partnerId: "p-1",
      propertyId: "prop-A",
      propertyName: "Hotel A",
      grossAmountUsd: 100,
      taxAmountUsd: 19,
      commissionAmountUsd: 20,
      netPayoutUsd: 80,
      capturedAt: "2026-03-02T00:00:00Z",
    });
  });

  it("falls back to defaults when payload is sparse", async () => {
    global.fetch = mockFetch(true, {}) as typeof fetch;
    const svc = new PaymentClientService();
    const result = await svc.getStatus("r2");
    expect(result?.status).toBe("unknown");
    expect(result?.amountUsd).toBe(0);
    expect(result?.currency).toBe("USD");
    expect(result?.stripePaymentIntentId).toBeNull();
    expect(result?.guestEmail).toBeNull();
  });

  describe("getDisbursement", () => {
    it("returns the JSON body on success", async () => {
      const payload = {
        partnerId: "p-1",
        month: "2026-03",
        status: "pending",
        totals: { gross: 100, tax: 19, partnerFee: 5, commission: 20, net: 80 },
        byProperty: [],
        paymentCount: 1,
      };
      global.fetch = mockFetch(true, payload) as typeof fetch;
      const svc = new PaymentClientService();

      const result = await svc.getDisbursement("p-1", "2026-03");

      expect(result).toEqual(payload);
      const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
      expect(url).toContain("/disbursements/by-partner/p-1");
      expect(url).toContain("month=2026-03");
    });

    it("returns null when payment-service responds non-ok", async () => {
      global.fetch = mockFetch(false, "", 500) as typeof fetch;
      const svc = new PaymentClientService();

      expect(await svc.getDisbursement("p-1", "2026-03")).toBeNull();
    });

    it("encodes the partnerId in the path", async () => {
      global.fetch = mockFetch(true, {}) as typeof fetch;
      const svc = new PaymentClientService();

      await svc.getDisbursement("partner with space", "2026-03");
      const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
      expect(url).toContain("partner%20with%20space");
    });
  });
});
