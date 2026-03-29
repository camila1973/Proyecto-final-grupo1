import { AvailabilityService } from "./availability.service";
import type { AvailabilityRepository } from "./availability.repository";
import type { RoomsService } from "../rooms/rooms.service";

const DAY: import("./availability.types").AvailabilityDayDto = {
  date: "2026-04-01",
  totalRooms: 5,
  reservedRooms: 0,
  heldRooms: 0,
  blocked: false,
  available: true,
};

function makeService(
  overrides: Partial<{
    repo: Partial<AvailabilityRepository>;
    roomsService: Partial<RoomsService>;
  }> = {},
) {
  const repo = {
    getAvailability: jest.fn().mockResolvedValue([DAY]),
    reduceCapacity: jest.fn().mockResolvedValue(undefined),
    blockDates: jest.fn().mockResolvedValue(undefined),
    unblockDates: jest.fn().mockResolvedValue(undefined),
    hold: jest.fn().mockResolvedValue(undefined),
    unhold: jest.fn().mockResolvedValue(undefined),
    confirm: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    ...overrides.repo,
  } as unknown as AvailabilityRepository;

  const roomsService = {
    findOne: jest.fn().mockResolvedValue({ id: "room-1" }),
    ...overrides.roomsService,
  } as unknown as RoomsService;

  return new AvailabilityService(repo, roomsService);
}

describe("AvailabilityService", () => {
  describe("getByRoom", () => {
    it("returns availability days for a room (with ownership check)", async () => {
      const service = makeService();
      const result = await service.getByRoom(
        "room-1",
        "partner-1",
        "2026-04-01",
        "2026-04-07",
      );
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2026-04-01");
    });
  });

  describe("getByRoomInternal", () => {
    it("returns availability without ownership check", async () => {
      const service = makeService();
      const result = await service.getByRoomInternal(
        "room-1",
        "2026-04-01",
        "2026-04-07",
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("bulkCheck", () => {
    it("returns empty array when no roomIds provided", async () => {
      const service = makeService();
      const result = await service.bulkCheck([], "2026-04-01", "2026-04-07");
      expect(result).toEqual([]);
    });

    it("returns available=true when all days are available", async () => {
      const service = makeService();
      const result = await service.bulkCheck(
        ["room-1"],
        "2026-04-01",
        "2026-04-07",
      );
      expect(result).toEqual([{ roomId: "room-1", available: true }]);
    });

    it("returns available=false when any day is blocked", async () => {
      const service = makeService({
        repo: {
          getAvailability: jest
            .fn()
            .mockResolvedValue([{ ...DAY, blocked: true, available: false }]),
        },
      });
      const result = await service.bulkCheck(
        ["room-1"],
        "2026-04-01",
        "2026-04-07",
      );
      expect(result[0].available).toBe(false);
    });

    it("returns available=false when no days returned", async () => {
      const service = makeService({
        repo: { getAvailability: jest.fn().mockResolvedValue([]) },
      });
      const result = await service.bulkCheck(
        ["room-1"],
        "2026-04-01",
        "2026-04-07",
      );
      expect(result[0].available).toBe(false);
    });

    it("checks multiple rooms", async () => {
      const service = makeService();
      const result = await service.bulkCheck(
        ["room-1", "room-2"],
        "2026-04-01",
        "2026-04-07",
      );
      expect(result).toHaveLength(2);
    });
  });

  describe("reduceCapacity", () => {
    it("checks ownership then calls repo.reduceCapacity", async () => {
      const reduceCapacity = jest.fn().mockResolvedValue(undefined);
      const service = makeService({ repo: { reduceCapacity } });
      await service.reduceCapacity("partner-1", {
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-05",
        totalRooms: 2,
      });
      expect(reduceCapacity).toHaveBeenCalledWith(
        "room-1",
        "2026-04-01",
        "2026-04-05",
        2,
      );
    });
  });

  describe("blockDates / unblockDates", () => {
    it("blockDates checks ownership then calls repo", async () => {
      const blockDates = jest.fn().mockResolvedValue(undefined);
      const service = makeService({ repo: { blockDates } });
      await service.blockDates("room-1", "partner-1", {
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-05",
      });
      expect(blockDates).toHaveBeenCalledWith(
        "room-1",
        "2026-04-01",
        "2026-04-05",
      );
    });

    it("unblockDates checks ownership then calls repo", async () => {
      const unblockDates = jest.fn().mockResolvedValue(undefined);
      const service = makeService({ repo: { unblockDates } });
      await service.unblockDates("room-1", "partner-1", {
        roomId: "room-1",
        fromDate: "2026-04-01",
        toDate: "2026-04-05",
      });
      expect(unblockDates).toHaveBeenCalledWith(
        "room-1",
        "2026-04-01",
        "2026-04-05",
      );
    });
  });

  describe("hold / unhold / confirm / release", () => {
    it("hold delegates to repo", async () => {
      const hold = jest.fn().mockResolvedValue(undefined);
      const service = makeService({ repo: { hold } });
      await service.hold("room-1", "2026-04-01", "2026-04-05");
      expect(hold).toHaveBeenCalledWith("room-1", "2026-04-01", "2026-04-05");
    });

    it("unhold delegates to repo", async () => {
      const unhold = jest.fn().mockResolvedValue(undefined);
      const service = makeService({ repo: { unhold } });
      await service.unhold("room-1", "2026-04-01", "2026-04-05");
      expect(unhold).toHaveBeenCalledWith("room-1", "2026-04-01", "2026-04-05");
    });

    it("confirm delegates to repo", async () => {
      const confirm = jest.fn().mockResolvedValue(undefined);
      const service = makeService({ repo: { confirm } });
      await service.confirm("room-1", "2026-04-01", "2026-04-05");
      expect(confirm).toHaveBeenCalledWith(
        "room-1",
        "2026-04-01",
        "2026-04-05",
      );
    });

    it("release delegates to repo", async () => {
      const release = jest.fn().mockResolvedValue(undefined);
      const service = makeService({ repo: { release } });
      await service.release("room-1", "2026-04-01", "2026-04-05");
      expect(release).toHaveBeenCalledWith(
        "room-1",
        "2026-04-01",
        "2026-04-05",
      );
    });
  });
});
