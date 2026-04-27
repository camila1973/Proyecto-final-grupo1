import { Test, TestingModule } from "@nestjs/testing";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardService } from "./dashboard.service.js";

describe("DashboardController", () => {
  let controller: DashboardController;
  let getHotelState: jest.Mock;
  let getPayments: jest.Mock;

  beforeEach(async () => {
    getHotelState = jest.fn().mockResolvedValue("hotel-state");
    getPayments = jest.fn().mockResolvedValue("payments");
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: { getHotelState, getPayments },
        },
      ],
    }).compile();
    controller = moduleRef.get(DashboardController);
  });

  describe("hotelState", () => {
    it("uses provided month + roomType", async () => {
      await controller.hotelState("p1", "2026-03", "Doble Superior");
      expect(getHotelState).toHaveBeenCalledWith(
        "p1",
        "2026-03",
        "Doble Superior",
      );
    });

    it("falls back to current month when month is invalid", async () => {
      await controller.hotelState("p1", "not-a-month", undefined);
      const call = getHotelState.mock.calls[0] as [
        string,
        string,
        string | null,
      ];
      expect(call[1]).toMatch(/^\d{4}-\d{2}$/);
      expect(call[2]).toBeNull();
    });

    it("treats blank roomType as null", async () => {
      await controller.hotelState("p1", "2026-03", "   ");
      expect(getHotelState).toHaveBeenCalledWith("p1", "2026-03", null);
    });
  });

  describe("payments", () => {
    it("clamps page and pageSize", async () => {
      await controller.payments("p1", "2026-03", "0", "9999");
      const call = getPayments.mock.calls[0] as [
        string,
        string | null,
        number,
        number,
      ];
      const [, month, page, pageSize] = call;
      expect(month).toBe("2026-03");
      expect(page).toBe(1);
      expect(pageSize).toBe(100);
    });

    it("uses defaults when page values are missing", async () => {
      await controller.payments("p1");
      const call = getPayments.mock.calls[0] as [
        string,
        string | null,
        number,
        number,
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
      ];
      const [, month, page, pageSize] = call;
      expect(month).toBeNull();
      expect(page).toBe(2);
      expect(pageSize).toBe(10);
    });
  });
});
