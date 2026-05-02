import { Test, TestingModule } from "@nestjs/testing";
import { PropertyController } from "./property.controller.js";
import { PropertyService } from "./property.service.js";

describe("PropertyController", () => {
  let controller: PropertyController;
  let getProperties: jest.Mock;
  let getPropertyMetrics: jest.Mock;
  let getPropertyReservations: jest.Mock;

  beforeEach(async () => {
    getProperties = jest.fn().mockResolvedValue("properties");
    getPropertyMetrics = jest.fn().mockResolvedValue("property-metrics");
    getPropertyReservations = jest
      .fn()
      .mockResolvedValue("property-reservations");
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PropertyController],
      providers: [
        {
          provide: PropertyService,
          useValue: {
            getProperties,
            getPropertyMetrics,
            getPropertyReservations,
          },
        },
      ],
    }).compile();
    controller = moduleRef.get(PropertyController);
  });

  describe("properties", () => {
    it("delegates to getProperties with partnerId", async () => {
      await controller.properties("p1");
      expect(getProperties).toHaveBeenCalledWith("p1");
    });
  });

  describe("propertyMetrics", () => {
    it("delegates with path params and sanitised month + roomType", async () => {
      await controller.propertyMetrics("p1", "prop-abc", "2026-03", "Suite");
      expect(getPropertyMetrics).toHaveBeenCalledWith(
        "p1",
        "prop-abc",
        "2026-03",
        "Suite",
      );
    });

    it("falls back to current month when month is invalid", async () => {
      await controller.propertyMetrics("p1", "prop-abc", "bad", undefined);
      const call = getPropertyMetrics.mock.calls[0] as [
        string,
        string,
        string,
        string | null,
      ];
      expect(call[2]).toMatch(/^\d{4}-\d{2}$/);
      expect(call[3]).toBeNull();
    });
  });

  describe("propertyReservations", () => {
    it("delegates with path params and null roomType when omitted", async () => {
      await controller.propertyReservations(
        "p1",
        "prop-abc",
        "2026-03",
        undefined,
      );
      expect(getPropertyReservations).toHaveBeenCalledWith(
        "p1",
        "prop-abc",
        "2026-03",
        null,
      );
    });

    it("trims roomType and treats blank as null", async () => {
      await controller.propertyReservations("p1", "prop-abc", "2026-03", "  ");
      expect(getPropertyReservations).toHaveBeenCalledWith(
        "p1",
        "prop-abc",
        "2026-03",
        null,
      );
    });
  });
});
