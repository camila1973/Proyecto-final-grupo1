import { BookingClientService } from "./booking-client.service.js";

const FEE_DATA = {
  partnerId: "p1",
  feeName: "Resort Fee",
  feeType: "FLAT_PER_NIGHT",
  currency: "USD",
  effectiveFrom: "2026-01-01",
};

function mockFetch(ok: boolean, body: unknown, status = 200) {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
  });
}

describe("BookingClientService", () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("upsertFee", () => {
    it("returns parsed json on success", async () => {
      global.fetch = mockFetch(true, { id: "fee-1" }) as typeof fetch;
      const svc = new BookingClientService();
      const result: Record<string, unknown> = await svc.upsertFee(FEE_DATA);
      expect(result).toEqual({ id: "fee-1" });
    });

    it("throws on non-ok response", async () => {
      global.fetch = mockFetch(false, "Bad Request", 400) as typeof fetch;
      const svc = new BookingClientService();
      await expect(svc.upsertFee(FEE_DATA)).rejects.toThrow(
        "booking-service upsert fee failed [400]",
      );
    });
  });

  describe("listFees", () => {
    it("returns array on success", async () => {
      global.fetch = mockFetch(true, [{ id: "fee-1" }]) as typeof fetch;
      const svc = new BookingClientService();
      const result: Record<string, unknown>[] = await svc.listFees("p1");
      expect(result).toEqual([{ id: "fee-1" }]);
    });

    it("throws on non-ok response", async () => {
      global.fetch = mockFetch(false, "Error", 500) as typeof fetch;
      const svc = new BookingClientService();
      await expect(svc.listFees("p1")).rejects.toThrow(
        "booking-service list fees failed [500]",
      );
    });
  });

  describe("deleteFee", () => {
    it("resolves on 204", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 204 }) as typeof fetch;
      const svc = new BookingClientService();
      await expect(svc.deleteFee("fee-1")).resolves.not.toThrow();
    });

    it("resolves on ok response", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: true, status: 200 }) as typeof fetch;
      const svc = new BookingClientService();
      await expect(svc.deleteFee("fee-1")).resolves.not.toThrow();
    });

    it("throws on non-ok and non-204", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 500 }) as typeof fetch;
      const svc = new BookingClientService();
      await expect(svc.deleteFee("fee-1")).rejects.toThrow(
        "booking-service delete fee failed [500]",
      );
    });
  });
});
