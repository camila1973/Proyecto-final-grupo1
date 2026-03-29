import { BadRequestException } from "@nestjs/common";
import { RoomRatesController } from "./room-rates.controller";
import type { RoomRatesService } from "./room-rates.service";

const PUBLIC_RATE = {
  id: "rate-1",
  roomId: "room-1",
  fromDate: "2026-04-01",
  toDate: "2026-04-10",
  priceUsd: "150.00",
  currency: "USD",
  createdAt: new Date(),
};

function makeController(overrides: Partial<RoomRatesService> = {}) {
  const service = {
    create: jest.fn().mockResolvedValue(PUBLIC_RATE),
    findByRoom: jest.fn().mockResolvedValue([PUBLIC_RATE]),
    findByProperty: jest.fn().mockResolvedValue([PUBLIC_RATE]),
    replace: jest.fn().mockResolvedValue(PUBLIC_RATE),
    remove: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as RoomRatesService;
  return { controller: new RoomRatesController(service), service };
}

describe("RoomRatesController", () => {
  describe("create", () => {
    it("delegates to service.create with roomId from body", async () => {
      const { controller, service } = makeController();
      const dto = {
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-10",
        priceUsd: 150,
      };
      const result = await controller.create("partner-1", dto);
      expect(service.create).toHaveBeenCalledWith("room-1", "partner-1", dto);
      expect(result.id).toBe("rate-1");
    });
  });

  describe("findAll", () => {
    it("throws BadRequestException when propertyId is missing", () => {
      const { controller } = makeController();
      expect(() =>
        controller.findAll("partner-1", undefined, undefined),
      ).toThrow(BadRequestException);
    });

    it("calls findByProperty when no roomId provided", async () => {
      const { controller, service } = makeController();
      await controller.findAll(
        "partner-1",
        undefined,
        "prop-1",
        undefined,
        undefined,
      );
      expect(service.findByProperty).toHaveBeenCalledWith(
        "prop-1",
        "partner-1",
        undefined,
        undefined,
      );
    });

    it("calls findByRoom when roomId is provided", async () => {
      const { controller, service } = makeController();
      await controller.findAll(
        "partner-1",
        "room-1",
        "prop-1",
        "2026-04-01",
        "2026-04-10",
      );
      expect(service.findByRoom).toHaveBeenCalledWith(
        "room-1",
        "partner-1",
        "2026-04-01",
        "2026-04-10",
      );
    });
  });

  describe("replace", () => {
    it("delegates to service.replace", async () => {
      const { controller, service } = makeController();
      const dto = {
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-10",
        priceUsd: 200,
      };
      await controller.replace("partner-1", "rate-1", dto);
      expect(service.replace).toHaveBeenCalledWith("rate-1", "partner-1", dto);
    });
  });

  describe("remove", () => {
    it("delegates to service.remove", async () => {
      const { controller, service } = makeController();
      await controller.remove("partner-1", "rate-1");
      expect(service.remove).toHaveBeenCalledWith("rate-1", "partner-1");
    });
  });
});
