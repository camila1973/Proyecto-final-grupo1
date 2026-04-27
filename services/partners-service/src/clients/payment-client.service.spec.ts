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
});
