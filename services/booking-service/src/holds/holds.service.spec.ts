import { ConflictException, NotFoundException } from "@nestjs/common";
import { HoldsService } from "./holds.service.js";
import type { CacheService } from "../cache/cache.service.js";
import type { InventoryClient } from "../clients/inventory.client.js";

const BOOKER = "booker-uuid";
const ROOM = "room-uuid";
const FROM = "2026-05-01";
const TO = "2026-05-04";
const DTO = { bookerId: BOOKER, roomId: ROOM, checkIn: FROM, checkOut: TO };

const HOLD_ID = "generated-hold-id";
const EXPIRES_AT = "2026-05-22T10:15:00.000Z";
const PAYLOAD = JSON.stringify({
  holdId: HOLD_ID,
  bookerId: BOOKER,
  roomId: ROOM,
  checkIn: FROM,
  checkOut: TO,
  expiresAt: EXPIRES_AT,
});

function makeService({
  setIfAbsent = jest.fn().mockResolvedValue(true),
  get = jest.fn().mockResolvedValue(null),
  set = jest.fn().mockResolvedValue(undefined),
  del = jest.fn().mockResolvedValue(undefined),
  getAndDelete = jest.fn().mockResolvedValue(null),
  hold = jest.fn().mockResolvedValue(undefined),
  unhold = jest.fn().mockResolvedValue(undefined),
}: {
  setIfAbsent?: jest.Mock;
  get?: jest.Mock;
  set?: jest.Mock;
  del?: jest.Mock;
  getAndDelete?: jest.Mock;
  hold?: jest.Mock;
  unhold?: jest.Mock;
} = {}) {
  const cache = {
    setIfAbsent,
    get,
    set,
    del,
    getAndDelete,
  } as unknown as CacheService;
  const inventoryClient = { hold, unhold } as unknown as InventoryClient;
  return {
    service: new HoldsService(cache, inventoryClient),
    cache,
    inventoryClient,
    hold,
    unhold,
    setIfAbsent,
    get,
    set,
    del,
    getAndDelete,
  };
}

describe("HoldsService", () => {
  describe("create", () => {
    it("places an inventory hold and returns holdId + expiresAt for a new hold", async () => {
      const { service, hold, set } = makeService({
        setIfAbsent: jest.fn().mockResolvedValue(true),
      });

      const result = await service.create(DTO);

      expect(hold).toHaveBeenCalledWith(ROOM, FROM, TO);
      expect(result.holdId).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(set).toHaveBeenCalled(); // by-id key written
    });

    it("returns the existing holdId without calling inventoryClient.hold on a duplicate request", async () => {
      const { service, hold } = makeService({
        setIfAbsent: jest.fn().mockResolvedValue(false),
        get: jest.fn().mockResolvedValue(PAYLOAD),
      });

      const result = await service.create(DTO);

      expect(hold).not.toHaveBeenCalled();
      expect(result.holdId).toBe(HOLD_ID);
      expect(result.expiresAt).toBe(EXPIRES_AT);
    });

    it("propagates ConflictException when inventory has no availability", async () => {
      const { service, del } = makeService({
        setIfAbsent: jest.fn().mockResolvedValue(true),
        hold: jest
          .fn()
          .mockRejectedValue(new ConflictException("No availability")),
      });

      await expect(service.create(DTO)).rejects.toThrow(ConflictException);
      expect(del).toHaveBeenCalled(); // key cleaned up after rejection
    });

    it("retries once when setIfAbsent returns false but get returns null (key just expired)", async () => {
      const setIfAbsent = jest
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      const get = jest.fn().mockResolvedValue(null);
      const hold = jest.fn().mockResolvedValue(undefined);
      const set = jest.fn().mockResolvedValue(undefined);
      const { service } = makeService({ setIfAbsent, get, hold, set });

      const result = await service.create(DTO);

      expect(setIfAbsent).toHaveBeenCalledTimes(2);
      expect(hold).toHaveBeenCalledTimes(1);
      expect(result.holdId).toBeDefined();
    });
  });

  describe("release", () => {
    it("unholds inventory when both Redis keys are found", async () => {
      const idempKey = `booking:hold:idempotency:${BOOKER}:${ROOM}:${FROM}:${TO}`;
      const { service, unhold } = makeService({
        getAndDelete: jest
          .fn()
          .mockResolvedValueOnce(idempKey)
          .mockResolvedValueOnce(PAYLOAD),
      });

      await service.release(HOLD_ID);

      expect(unhold).toHaveBeenCalledWith(ROOM, FROM, TO);
    });

    it("throws NotFoundException when by-id key is not found", async () => {
      const { service, unhold } = makeService({
        getAndDelete: jest.fn().mockResolvedValue(null),
      });

      await expect(service.release(HOLD_ID)).rejects.toThrow(NotFoundException);
      expect(unhold).not.toHaveBeenCalled();
    });

    it("resolves without calling unhold when idempotency key is already gone (hold consumed by reservation)", async () => {
      const { service, unhold } = makeService({
        getAndDelete: jest
          .fn()
          .mockResolvedValueOnce("some-idemp-key")
          .mockResolvedValueOnce(null),
      });

      await expect(service.release(HOLD_ID)).resolves.not.toThrow();
      expect(unhold).not.toHaveBeenCalled();
    });
  });
});
