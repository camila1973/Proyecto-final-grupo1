import { NoShowService } from "./no-show.service.js";
import type { ReservationsRepository } from "./reservations.repository.js";
import type { ReservationsService } from "./reservations.service.js";
import type { CacheService } from "../cache/cache.service.js";

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "res-uuid",
    room_id: "room-uuid",
    check_in: "2026-05-01",
    check_out: "2026-05-04",
    status: "confirmed",
    ...overrides,
  };
}

function makeService({
  findStaleConfirmed = jest.fn().mockResolvedValue([]),
  noShow = jest.fn().mockResolvedValue({ id: "res-uuid" }),
  acquireLock = jest.fn().mockResolvedValue(true),
}: {
  findStaleConfirmed?: jest.Mock;
  noShow?: jest.Mock;
  acquireLock?: jest.Mock;
} = {}) {
  const repo = { findStaleConfirmed } as unknown as ReservationsRepository;
  const reservationsService = { noShow } as unknown as ReservationsService;
  const cache = { acquireLock } as unknown as CacheService;
  return {
    service: new NoShowService(repo, reservationsService, cache),
    findStaleConfirmed,
    noShow,
    acquireLock,
  };
}

describe("NoShowService", () => {
  describe("markStaleConfirmedAsNoShow", () => {
    it("skips the sweep when the Redis lock is already held", async () => {
      const { service, findStaleConfirmed } = makeService({
        acquireLock: jest.fn().mockResolvedValue(false),
      });

      await service.markStaleConfirmedAsNoShow();

      expect(findStaleConfirmed).not.toHaveBeenCalled();
    });

    it("does nothing when no stale confirmed rows exist", async () => {
      const { service, noShow } = makeService({
        findStaleConfirmed: jest.fn().mockResolvedValue([]),
      });

      await service.markStaleConfirmedAsNoShow();

      expect(noShow).not.toHaveBeenCalled();
    });

    it("invokes service.noShow for each stale row", async () => {
      const rows = [
        makeRow({ id: "r1" }),
        makeRow({ id: "r2" }),
        makeRow({ id: "r3" }),
      ];
      const { service, noShow } = makeService({
        findStaleConfirmed: jest.fn().mockResolvedValue(rows),
      });

      await service.markStaleConfirmedAsNoShow();

      expect(noShow).toHaveBeenCalledTimes(3);
      expect(noShow).toHaveBeenNthCalledWith(1, "r1");
      expect(noShow).toHaveBeenNthCalledWith(2, "r2");
      expect(noShow).toHaveBeenNthCalledWith(3, "r3");
    });

    it("continues processing remaining rows when one transition throws", async () => {
      const rows = [makeRow({ id: "r1" }), makeRow({ id: "r2" })];
      const { service, noShow } = makeService({
        findStaleConfirmed: jest.fn().mockResolvedValue(rows),
        noShow: jest
          .fn()
          .mockRejectedValueOnce(new Error("publisher down"))
          .mockResolvedValueOnce({ id: "r2" }),
      });

      await expect(service.markStaleConfirmedAsNoShow()).resolves.not.toThrow();
      expect(noShow).toHaveBeenCalledTimes(2);
    });
  });
});
