import { Test, TestingModule } from "@nestjs/testing";
import { PartnersController } from "./partners.controller.js";
import { PartnersService } from "./partners.service.js";

describe("PartnersController (dashboard)", () => {
  let controller: PartnersController;
  let getPartnerMetrics: jest.Mock;
  let getPayments: jest.Mock;

  beforeEach(async () => {
    getPartnerMetrics = jest.fn().mockResolvedValue("partner-metrics");
    getPayments = jest.fn().mockResolvedValue("payments");
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PartnersController],
      providers: [
        {
          provide: PartnersService,
          useValue: { getPartnerMetrics, getPayments },
        },
      ],
    }).compile();
    controller = moduleRef.get(PartnersController);
  });

  describe("partnerMetrics", () => {
    it("delegates with partnerId, month, and roomType", async () => {
      await controller.partnerMetrics("p1", "2026-03", "Suite");
      expect(getPartnerMetrics).toHaveBeenCalledWith("p1", "2026-03", "Suite");
    });

    it("falls back to current month when month is invalid", async () => {
      await controller.partnerMetrics("p1", "not-a-month", undefined);
      const call = getPartnerMetrics.mock.calls[0] as [
        string,
        string,
        string | null,
      ];
      expect(call[1]).toMatch(/^\d{4}-\d{2}$/);
      expect(call[2]).toBeNull();
    });

    it("treats blank roomType as null", async () => {
      await controller.partnerMetrics("p1", "2026-03", "   ");
      expect(getPartnerMetrics).toHaveBeenCalledWith("p1", "2026-03", null);
    });
  });

  describe("payments", () => {
    it("clamps page and pageSize, passes null propertyId", async () => {
      await controller.payments("p1", "2026-03", "0", "9999");
      const call = getPayments.mock.calls[0] as [
        string,
        string | null,
        number,
        number,
        string | null,
      ];
      const [, month, page, pageSize, propertyId] = call;
      expect(month).toBe("2026-03");
      expect(page).toBe(1);
      expect(pageSize).toBe(100);
      expect(propertyId).toBeNull();
    });

    it("uses defaults when page values are missing", async () => {
      await controller.payments("p1");
      const call = getPayments.mock.calls[0] as [
        string,
        string | null,
        number,
        number,
        string | null,
      ];
      const [, month, page, pageSize] = call;
      expect(month).toBeNull();
      expect(page).toBe(1);
      expect(pageSize).toBe(20);
    });

    it("ignores invalid month", async () => {
      await controller.payments("p1", "junk", "2", "10");
      const call = getPayments.mock.calls[0] as [
        string,
        string | null,
        number,
        number,
        string | null,
      ];
      const [, month, page, pageSize] = call;
      expect(month).toBeNull();
      expect(page).toBe(2);
      expect(pageSize).toBe(10);
    });

    it("passes propertyId when provided", async () => {
      await controller.payments("p1", "2026-03", "1", "10", "prop-xyz");
      expect(getPayments).toHaveBeenCalledWith(
        "p1",
        "2026-03",
        1,
        10,
        "prop-xyz",
      );
    });
  });
});
