import { Test, TestingModule } from "@nestjs/testing";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardService } from "./dashboard.service.js";

describe("DashboardController", () => {
  let controller: DashboardController;
  let getHotelState: jest.Mock;
  let getPayments: jest.Mock;
  let getProperties: jest.Mock;

  beforeEach(async () => {
    getHotelState = jest.fn().mockResolvedValue("hotel-state");
    getPayments = jest.fn().mockResolvedValue("payments");
    getProperties = jest.fn().mockResolvedValue("properties");
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: { getHotelState, getPayments, getProperties },
        },
      ],
    }).compile();
    controller = moduleRef.get(DashboardController);
  });

  describe("properties", () => {
    it("delegates to getProperties with partnerId", async () => {
      await controller.properties("p1");
      expect(getProperties).toHaveBeenCalledWith("p1");
    });
  });

  describe("hotelState", () => {
    it("uses provided month + roomType, passes null propertyId", async () => {
      await controller.hotelState("p1", "2026-03", "Doble Superior");
      expect(getHotelState).toHaveBeenCalledWith(
        "p1",
        "2026-03",
        "Doble Superior",
        null,
      );
    });

    it("falls back to current month when month is invalid", async () => {
      await controller.hotelState("p1", "not-a-month", undefined);
      const call = getHotelState.mock.calls[0] as [
        string,
        string,
        string | null,
        string | null,
      ];
      expect(call[1]).toMatch(/^\d{4}-\d{2}$/);
      expect(call[2]).toBeNull();
      expect(call[3]).toBeNull();
    });

    it("treats blank roomType as null", async () => {
      await controller.hotelState("p1", "2026-03", "   ");
      expect(getHotelState).toHaveBeenCalledWith("p1", "2026-03", null, null);
    });

    it("passes propertyId when provided", async () => {
      await controller.hotelState("p1", "2026-03", undefined, "prop-abc");
      expect(getHotelState).toHaveBeenCalledWith(
        "p1",
        "2026-03",
        null,
        "prop-abc",
      );
    });

    it("treats blank propertyId as null", async () => {
      await controller.hotelState("p1", "2026-03", undefined, "   ");
      expect(getHotelState).toHaveBeenCalledWith("p1", "2026-03", null, null);
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
