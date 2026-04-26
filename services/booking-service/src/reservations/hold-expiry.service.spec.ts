import { HoldExpiryService } from "./hold-expiry.service.js";
import type { ReservationsRepository } from "./reservations.repository.js";
import type { InventoryClient } from "../clients/inventory.client.js";
import type { CacheService } from "../cache/cache.service.js";

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "res-uuid",
    room_id: "room-uuid",
    check_in: "2026-05-01",
    check_out: "2026-05-04",
    status: "held",
    ...overrides,
  };
}

function makeService({
  findExpiredHolds = jest.fn().mockResolvedValue([]),
  expire = jest.fn().mockResolvedValue(makeRow({ status: "expired" })),
  unhold = jest.fn().mockResolvedValue(undefined),
  acquireLock = jest.fn().mockResolvedValue(true),
}: {
  findExpiredHolds?: jest.Mock;
  expire?: jest.Mock;
  unhold?: jest.Mock;
  acquireLock?: jest.Mock;
} = {}) {
  const repo = {
    findExpiredHolds,
    expire,
  } as unknown as ReservationsRepository;
  const inventoryClient = { unhold } as unknown as InventoryClient;
  const cache = { acquireLock } as unknown as CacheService;
  return {
    service: new HoldExpiryService(repo, inventoryClient, cache),
    unhold,
    expire,
    findExpiredHolds,
    acquireLock,
  };
}

describe("HoldExpiryService", () => {
  describe("expireHolds", () => {
    it("skips the sweep when the Redis lock is already held", async () => {
      const { service, findExpiredHolds } = makeService({
        acquireLock: jest.fn().mockResolvedValue(false),
      });

      await service.expireHolds();

      expect(findExpiredHolds).not.toHaveBeenCalled();
    });

    it("does nothing when no holds have expired", async () => {
      const { service, expire, unhold } = makeService({
        findExpiredHolds: jest.fn().mockResolvedValue([]),
      });

      await service.expireHolds();

      expect(expire).not.toHaveBeenCalled();
      expect(unhold).not.toHaveBeenCalled();
    });

    it("expires the DB row and unholds inventory for each expired hold", async () => {
      const row = makeRow();
      const { service, expire, unhold } = makeService({
        findExpiredHolds: jest.fn().mockResolvedValue([row]),
        expire: jest.fn().mockResolvedValue(makeRow({ status: "expired" })),
      });

      await service.expireHolds();

      expect(expire).toHaveBeenCalledWith(row.id);
      expect(unhold).toHaveBeenCalledWith(
        row.room_id,
        row.check_in,
        row.check_out,
      );
    });

    it("skips unhold when expire returns undefined (row already confirmed)", async () => {
      const row = makeRow();
      const { service, unhold } = makeService({
        findExpiredHolds: jest.fn().mockResolvedValue([row]),
        expire: jest.fn().mockResolvedValue(undefined),
      });

      await service.expireHolds();

      expect(unhold).not.toHaveBeenCalled();
    });

    it("logs a warning and continues when inventory unhold fails", async () => {
      const row = makeRow();
      const { service, expire } = makeService({
        findExpiredHolds: jest.fn().mockResolvedValue([row]),
        expire: jest.fn().mockResolvedValue(makeRow({ status: "expired" })),
        unhold: jest.fn().mockRejectedValue(new Error("inventory down")),
      });

      await expect(service.expireHolds()).resolves.not.toThrow();
      expect(expire).toHaveBeenCalled();
    });

    it("processes multiple expired rows independently", async () => {
      const rows = [makeRow({ id: "r1" }), makeRow({ id: "r2" })];
      const { service, expire, unhold } = makeService({
        findExpiredHolds: jest.fn().mockResolvedValue(rows),
        expire: jest.fn().mockResolvedValue(makeRow({ status: "expired" })),
      });

      await service.expireHolds();

      expect(expire).toHaveBeenCalledTimes(2);
      expect(unhold).toHaveBeenCalledTimes(2);
    });
  });
});
