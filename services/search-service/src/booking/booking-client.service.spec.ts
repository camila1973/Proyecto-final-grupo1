import { BookingClientService } from "./booking-client.service.js";

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof fetch;

describe("BookingClientService", () => {
  let service: BookingClientService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.BOOKING_SERVICE_URL;
    service = new BookingClientService();
  });

  describe("getTaxRules", () => {
    it("returns tax rules on a successful response", async () => {
      const rules = [
        {
          id: "r1",
          country: "Mexico",
          city: null,
          tax_name: "IVA",
          tax_type: "PERCENTAGE",
          rate: "16",
          flat_amount: null,
          currency: "USD",
          is_active: true,
        },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(rules),
      });

      const result = await service.getTaxRules("Mexico");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("country=Mexico"),
      );
      expect(result).toEqual(rules);
    });

    it("throws when response status is not ok", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      await expect(service.getTaxRules("Mexico")).rejects.toThrow(
        "booking-service getTaxRules failed: 500",
      );
    });

    it("uses BOOKING_SERVICE_URL env var when set", async () => {
      process.env.BOOKING_SERVICE_URL = "http://booking:4000";
      service = new BookingClientService();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await service.getTaxRules("Colombia");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("http://booking:4000"),
      );
    });
  });

  describe("getPartnerFees", () => {
    it("returns partner fees on a successful response", async () => {
      const fees = [
        {
          id: "f1",
          partner_id: "p1",
          fee_name: "Resort Fee",
          fee_type: "FLAT_PER_NIGHT",
          rate: null,
          flat_amount: "25",
          currency: "USD",
          is_active: true,
        },
      ];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(fees),
      });

      const result = await service.getPartnerFees("p1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("partnerId=p1"),
      );
      expect(result).toEqual(fees);
    });

    it("throws when response status is not ok", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      await expect(service.getPartnerFees("p1")).rejects.toThrow(
        "booking-service getPartnerFees failed: 404",
      );
    });
  });
});
