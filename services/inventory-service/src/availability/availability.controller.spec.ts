import { AvailabilityController } from "./availability.controller";
import type { AvailabilityService } from "./availability.service";

const BULK_RESULT = [{ roomId: "room-1", available: true }];

function makeController(overrides: Partial<AvailabilityService> = {}) {
  const service = {
    bulkCheck: jest.fn().mockResolvedValue(BULK_RESULT),
    reduceCapacity: jest.fn().mockResolvedValue(undefined),
    blockDates: jest.fn().mockResolvedValue(undefined),
    unblockDates: jest.fn().mockResolvedValue(undefined),
    hold: jest.fn().mockResolvedValue(undefined),
    unhold: jest.fn().mockResolvedValue(undefined),
    confirm: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as AvailabilityService;

  return { controller: new AvailabilityController(service), service };
}

describe("AvailabilityController", () => {
  describe("getAvailability", () => {
    it("splits comma-separated roomIds and delegates to service.bulkCheck", async () => {
      const { controller, service } = makeController();
      const result = await controller.getAvailability(
        "room-1,room-2",
        "2026-04-01",
        "2026-04-07",
      );
      expect(service.bulkCheck).toHaveBeenCalledWith(
        ["room-1", "room-2"],
        "2026-04-01",
        "2026-04-07",
      );
      expect(result).toEqual(BULK_RESULT);
    });
  });

  describe("reduceCapacity", () => {
    it("delegates to service.reduceCapacity", async () => {
      const { controller, service } = makeController();
      await controller.reduceCapacity("partner-1", {
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-05",
        totalRooms: 2,
      });
      expect(service.reduceCapacity).toHaveBeenCalledWith(
        "partner-1",
        expect.objectContaining({ roomId: "room-1", totalRooms: 2 }),
      );
    });
  });

  describe("blockDates", () => {
    it("delegates to service.blockDates", async () => {
      const { controller, service } = makeController();
      const dto = {
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-05",
      };
      await controller.blockDates("partner-1", dto);
      expect(service.blockDates).toHaveBeenCalledWith(
        "room-1",
        "partner-1",
        dto,
      );
    });
  });

  describe("unblockDates", () => {
    it("delegates to service.unblockDates", async () => {
      const { controller, service } = makeController();
      const dto = {
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-05",
      };
      await controller.unblockDates("partner-1", dto);
      expect(service.unblockDates).toHaveBeenCalledWith(
        "room-1",
        "partner-1",
        dto,
      );
    });
  });

  describe("hold", () => {
    it("delegates to service.hold", async () => {
      const { controller, service } = makeController();
      await controller.hold({
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-05",
      });
      expect(service.hold).toHaveBeenCalledWith(
        "room-1",
        "2026-04-01",
        "2026-04-05",
      );
    });
  });

  describe("unhold", () => {
    it("delegates to service.unhold", async () => {
      const { controller, service } = makeController();
      await controller.unhold({
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-05",
      });
      expect(service.unhold).toHaveBeenCalledWith(
        "room-1",
        "2026-04-01",
        "2026-04-05",
      );
    });
  });

  describe("confirm", () => {
    it("delegates to service.confirm", async () => {
      const { controller, service } = makeController();
      await controller.confirm({
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-05",
      });
      expect(service.confirm).toHaveBeenCalledWith(
        "room-1",
        "2026-04-01",
        "2026-04-05",
      );
    });
  });

  describe("release", () => {
    it("delegates to service.release", async () => {
      const { controller, service } = makeController();
      await controller.release({
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-05",
      });
      expect(service.release).toHaveBeenCalledWith(
        "room-1",
        "2026-04-01",
        "2026-04-05",
      );
    });
  });
});
