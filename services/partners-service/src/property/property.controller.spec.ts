import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PropertyController } from "./property.controller.js";
import { PropertyService } from "./property.service.js";

describe("PropertyController", () => {
  let controller: PropertyController;
  let getProperties: jest.Mock;
  let getPropertySummary: jest.Mock;
  let getPropertyMetrics: jest.Mock;
  let getPropertyReservations: jest.Mock;
  let getPropertyRooms: jest.Mock;
  let getRoomDetail: jest.Mock;
  let getRoomAvailability: jest.Mock;
  let getRoomRates: jest.Mock;
  let blockRoomDates: jest.Mock;
  let unblockRoomDates: jest.Mock;
  let createRoomRate: jest.Mock;
  let deleteRoomRate: jest.Mock;
  let updateRoomRate: jest.Mock;

  beforeEach(async () => {
    getProperties = jest.fn().mockResolvedValue("properties");
    getPropertySummary = jest.fn().mockResolvedValue("property-summary");
    getPropertyMetrics = jest.fn().mockResolvedValue("property-metrics");
    getPropertyReservations = jest
      .fn()
      .mockResolvedValue("property-reservations");
    getPropertyRooms = jest.fn().mockResolvedValue("property-rooms");
    getRoomDetail = jest.fn().mockResolvedValue({ id: "room-1" });
    getRoomAvailability = jest.fn().mockResolvedValue([]);
    getRoomRates = jest.fn().mockResolvedValue([]);
    blockRoomDates = jest.fn().mockResolvedValue(undefined);
    unblockRoomDates = jest.fn().mockResolvedValue(undefined);
    createRoomRate = jest.fn().mockResolvedValue(undefined);
    deleteRoomRate = jest.fn().mockResolvedValue(undefined);
    updateRoomRate = jest.fn().mockResolvedValue(undefined);
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PropertyController],
      providers: [
        {
          provide: PropertyService,
          useValue: {
            getProperties,
            getPropertySummary,
            getPropertyMetrics,
            getPropertyReservations,
            getPropertyRooms,
            getRoomDetail,
            getRoomAvailability,
            getRoomRates,
            blockRoomDates,
            unblockRoomDates,
            createRoomRate,
            deleteRoomRate,
            updateRoomRate,
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
    it("delegates with path params and all filters null when omitted", async () => {
      await controller.propertyReservations(
        "p1",
        "prop-abc",
        "2026-03",
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(getPropertyReservations).toHaveBeenCalledWith(
        "p1",
        "prop-abc",
        "2026-03",
        null,
        null,
        null,
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
        null,
        null,
        null,
      );
    });

    it("passes trimmed status, reservationId and guestName filters", async () => {
      await controller.propertyReservations(
        "p1",
        "prop-abc",
        "2026-03",
        undefined,
        " confirmed ",
        " ABC123 ",
        " carlos ",
      );
      expect(getPropertyReservations).toHaveBeenCalledWith(
        "p1",
        "prop-abc",
        "2026-03",
        null,
        "confirmed",
        "ABC123",
        "carlos",
      );
    });
  });

  describe("property", () => {
    it("delegates to getPropertySummary", async () => {
      await controller.property("p1", "prop-abc");
      expect(getPropertySummary).toHaveBeenCalledWith("p1", "prop-abc");
    });
  });

  describe("propertyRooms", () => {
    it("delegates to getPropertyRooms with current month", async () => {
      await controller.propertyRooms("p1", "prop-abc");
      expect(getPropertyRooms).toHaveBeenCalledWith(
        "p1",
        "prop-abc",
        expect.stringMatching(/^\d{4}-\d{2}$/),
      );
    });
  });

  describe("roomDetail", () => {
    it("returns the room when found", async () => {
      const result = await controller.roomDetail("room-1");
      expect(result).toEqual({ id: "room-1" });
      expect(getRoomDetail).toHaveBeenCalledWith("room-1");
    });

    it("throws NotFoundException when service returns null", async () => {
      getRoomDetail.mockResolvedValueOnce(null);
      await expect(controller.roomDetail("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("roomAvailability", () => {
    it("delegates with provided fromDate/toDate", async () => {
      await controller.roomAvailability("room-1", "2026-05-01", "2026-05-31");
      expect(getRoomAvailability).toHaveBeenCalledWith(
        "room-1",
        "2026-05-01",
        "2026-05-31",
      );
    });

    it("uses default month range when from/to invalid", async () => {
      await controller.roomAvailability("room-1");
      const call = getRoomAvailability.mock.calls[0] as [
        string,
        string,
        string,
      ];
      expect(call[0]).toBe("room-1");
      expect(call[1]).toMatch(/^\d{4}-\d{2}-01$/);
      expect(call[2]).toMatch(/^\d{4}-\d{2}-01$/);
    });

    it("uses default range when fromDate is invalid format", async () => {
      await controller.roomAvailability("room-1", "garbage", "garbage");
      const call = getRoomAvailability.mock.calls[0] as [
        string,
        string,
        string,
      ];
      expect(call[1]).toMatch(/^\d{4}-\d{2}-01$/);
      expect(call[2]).toMatch(/^\d{4}-\d{2}-01$/);
    });
  });

  describe("roomRates", () => {
    it("delegates with provided range", async () => {
      await controller.roomRates(
        "prop-abc",
        "room-1",
        "2026-05-01",
        "2026-05-31",
      );
      expect(getRoomRates).toHaveBeenCalledWith(
        "room-1",
        "prop-abc",
        "2026-05-01",
        "2026-05-31",
      );
    });

    it("uses default month range when not provided", async () => {
      await controller.roomRates("prop-abc", "room-1");
      const call = getRoomRates.mock.calls[0] as [
        string,
        string,
        string,
        string,
      ];
      expect(call[2]).toMatch(/^\d{4}-\d{2}-01$/);
      expect(call[3]).toMatch(/^\d{4}-\d{2}-01$/);
    });
  });

  describe("blockRoom / unblockRoom", () => {
    it("delegates blockRoom to service", async () => {
      await controller.blockRoom("room-1", {
        fromDate: "2026-05-01",
        toDate: "2026-05-05",
      });
      expect(blockRoomDates).toHaveBeenCalledWith(
        "room-1",
        "2026-05-01",
        "2026-05-05",
      );
    });

    it("delegates unblockRoom to service", async () => {
      await controller.unblockRoom("room-1", {
        fromDate: "2026-05-01",
        toDate: "2026-05-05",
      });
      expect(unblockRoomDates).toHaveBeenCalledWith(
        "room-1",
        "2026-05-01",
        "2026-05-05",
      );
    });
  });

  describe("createRate / deleteRate / updateRate", () => {
    it("delegates createRate to service", async () => {
      await controller.createRate("room-1", {
        fromDate: "2026-05-01",
        toDate: "2026-05-05",
        priceUsd: 150,
      });
      expect(createRoomRate).toHaveBeenCalledWith(
        "room-1",
        "2026-05-01",
        "2026-05-05",
        150,
      );
    });

    it("delegates deleteRate to service", async () => {
      await controller.deleteRate("rate-1");
      expect(deleteRoomRate).toHaveBeenCalledWith("rate-1");
    });

    it("delegates updateRate to service", async () => {
      await controller.updateRate("rate-1", {
        fromDate: "2026-05-01",
        toDate: "2026-05-31",
        priceUsd: 200,
      });
      expect(updateRoomRate).toHaveBeenCalledWith(
        "rate-1",
        "2026-05-01",
        "2026-05-31",
        200,
      );
    });
  });
});
