import { BadRequestException } from "@nestjs/common";
import { RoomsController } from "./rooms.controller";
import type { RoomsService } from "./rooms.service";

const PUBLIC_ROOM = {
  id: "room-1",
  propertyId: "prop-1",
  roomType: "double",
  capacity: 2,
  totalRooms: 5,
  basePriceUsd: "150.00",
  status: "active",
  country: "MX",
  city: "Cancún",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeController(overrides: Partial<RoomsService> = {}) {
  const service = {
    create: jest.fn().mockResolvedValue(PUBLIC_ROOM),
    findByProperty: jest.fn().mockResolvedValue([PUBLIC_ROOM]),
    findOne: jest.fn().mockResolvedValue(PUBLIC_ROOM),
    update: jest.fn().mockResolvedValue(PUBLIC_ROOM),
    remove: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as RoomsService;
  return { controller: new RoomsController(service), service };
}

describe("RoomsController", () => {
  describe("create", () => {
    it("delegates to service.create with propertyId from body", async () => {
      const { controller, service } = makeController();
      const dto = {
        propertyId: "prop-1",
        roomType: "double",
        capacity: 2,
        totalRooms: 5,
        basePriceUsd: 150,
      };
      const result = await controller.create("partner-1", dto);
      expect(service.create).toHaveBeenCalledWith("prop-1", "partner-1", dto);
      expect(result.id).toBe("room-1");
    });
  });

  describe("findAll", () => {
    it("delegates when propertyId is provided", async () => {
      const { controller, service } = makeController();
      const result = await controller.findAll("prop-1");
      expect(service.findByProperty).toHaveBeenCalledWith("prop-1");
      expect(result).toHaveLength(1);
    });

    it("throws BadRequestException when propertyId is missing", () => {
      const { controller } = makeController();
      expect(() => controller.findAll(undefined)).toThrow(BadRequestException);
    });
  });

  describe("findOne", () => {
    it("delegates to service.findOne", async () => {
      const { controller, service } = makeController();
      const result = await controller.findOne("room-1");
      expect(service.findOne).toHaveBeenCalledWith("room-1");
      expect(result.id).toBe("room-1");
    });
  });

  describe("update", () => {
    it("delegates to service.update", async () => {
      const { controller, service } = makeController();
      await controller.update("partner-1", "room-1", { capacity: 3 });
      expect(service.update).toHaveBeenCalledWith("room-1", "partner-1", {
        capacity: 3,
      });
    });
  });

  describe("remove", () => {
    it("delegates to service.remove", async () => {
      const { controller, service } = makeController();
      await controller.remove("room-1");
      expect(service.remove).toHaveBeenCalledWith("room-1");
    });
  });
});
