import { AvailabilityRepository } from "./availability.repository";
import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { Database } from "../database/database.types";

jest.mock("kysely", () => {
  const actual = jest.requireActual<typeof import("kysely")>("kysely");
  return {
    ...actual,
    sql: Object.assign(
      jest.fn().mockReturnValue({
        execute: jest.fn().mockResolvedValue({ rows: [] }),
      }),
      actual.sql,
    ),
  };
});

function makeInsertChain(resolved: { execute?: any } = {}) {
  const oc = {
    columns: jest.fn().mockReturnThis(),
    doUpdateSet: jest.fn().mockReturnThis(),
  };
  const chain: Record<string, any> = {};
  for (const m of [
    "insertInto",
    "updateTable",
    "deleteFrom",
    "values",
    "set",
    "where",
    "returningAll",
  ]) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain["onConflict"] = jest.fn().mockImplementation((cb: (oc: any) => any) => {
    cb(oc);
    return chain;
  });
  chain["execute"] = jest.fn().mockResolvedValue(resolved.execute ?? []);
  chain["executeTakeFirst"] = jest.fn().mockResolvedValue(undefined);
  return { chain, oc };
}

function makeTrxChain() {
  const trxChain: Record<string, any> = {};
  for (const m of [
    "insertInto",
    "updateTable",
    "deleteFrom",
    "values",
    "set",
    "where",
  ]) {
    trxChain[m] = jest.fn().mockReturnValue(trxChain);
  }
  trxChain["execute"] = jest.fn().mockResolvedValue([]);
  trxChain["onConflict"] = jest
    .fn()
    .mockImplementation((cb: (oc: any) => any) => {
      const oc = {
        columns: jest.fn().mockReturnThis(),
        doUpdateSet: jest.fn().mockReturnThis(),
      };
      cb(oc);
      return trxChain;
    });
  return trxChain;
}

function makeRepo(chainOverrides: Partial<Record<string, any>> = {}) {
  const { chain } = makeInsertChain();
  const trxChain = makeTrxChain();

  const db = {
    ...chain,
    ...chainOverrides,
    transaction: jest.fn().mockReturnValue({
      execute: jest
        .fn()
        .mockImplementation(async (cb: (trx: any) => Promise<void>) => {
          await cb(trxChain);
        }),
    }),
  } as unknown as Kysely<Database>;

  return { repo: new AvailabilityRepository(db as any), db, chain, trxChain };
}

describe("AvailabilityRepository", () => {
  describe("blockDates", () => {
    it("inserts a blocked row for each day in the range", async () => {
      const { repo, chain } = makeRepo();
      await repo.blockDates("room-1", "2026-04-01", "2026-04-03");
      // 2 days: Apr 1 and Apr 2
      expect(chain["insertInto"]).toHaveBeenCalledTimes(2);
      expect(chain["insertInto"]).toHaveBeenCalledWith("inv_availability");
      expect(chain["values"]).toHaveBeenCalledWith(
        expect.objectContaining({ room_id: "room-1", blocked: true }),
      );
    });

    it("does nothing when fromDate equals toDate (empty range)", async () => {
      const { repo, chain } = makeRepo();
      await repo.blockDates("room-1", "2026-04-01", "2026-04-01");
      expect(chain["insertInto"]).not.toHaveBeenCalled();
    });
  });

  describe("unblockDates", () => {
    it("updates blocked=false for each day and cleans up sparse rows", async () => {
      const { repo, chain } = makeRepo();
      await repo.unblockDates("room-1", "2026-04-01", "2026-04-03");
      // updateTable called for 2 days + 1 cleanupSparse call
      expect(chain["updateTable"]).toHaveBeenCalledWith("inv_availability");
      expect(chain["set"]).toHaveBeenCalledWith({ blocked: false });
    });
  });

  describe("reduceCapacity", () => {
    it("upserts total_rooms for each day in the range", async () => {
      const { repo, chain } = makeRepo();
      await repo.reduceCapacity("room-1", "2026-04-01", "2026-04-04", 2);
      // 3 days: Apr 1, Apr 2, Apr 3
      expect(chain["insertInto"]).toHaveBeenCalledTimes(3);
      expect(chain["values"]).toHaveBeenCalledWith(
        expect.objectContaining({ room_id: "room-1", total_rooms: 2 }),
      );
    });
  });

  describe("hold", () => {
    it("runs within a transaction", async () => {
      const { repo, db } = makeRepo();
      const sqlMock = sql as unknown as jest.Mock;
      sqlMock.mockReturnValue({
        execute: jest
          .fn()
          .mockResolvedValue({ rows: [{ remaining: 1, blocked: false }] }),
      });
      await expect(
        repo.hold("room-1", "2026-04-01", "2026-04-02"),
      ).resolves.not.toThrow();
      expect((db as any).transaction).toHaveBeenCalled();
    });

    it("throws ConflictException when remaining < 0", async () => {
      const { repo } = makeRepo();
      const sqlMock = sql as unknown as jest.Mock;
      sqlMock.mockReturnValue({
        execute: jest
          .fn()
          .mockResolvedValue({ rows: [{ remaining: -1, blocked: false }] }),
      });
      await expect(
        repo.hold("room-1", "2026-04-01", "2026-04-02"),
      ).rejects.toThrow();
    });

    it("throws ConflictException when room is blocked", async () => {
      const { repo } = makeRepo();
      const sqlMock = sql as unknown as jest.Mock;
      sqlMock.mockReturnValue({
        execute: jest
          .fn()
          .mockResolvedValue({ rows: [{ remaining: 2, blocked: true }] }),
      });
      await expect(
        repo.hold("room-1", "2026-04-01", "2026-04-02"),
      ).rejects.toThrow();
    });
  });

  describe("unhold", () => {
    it("decrements held_rooms in a transaction and cleans up", async () => {
      const { repo, db } = makeRepo();
      const sqlMock = sql as unknown as jest.Mock;
      sqlMock.mockReturnValue({
        execute: jest.fn().mockResolvedValue({ rows: [] }),
      });
      await expect(
        repo.unhold("room-1", "2026-04-01", "2026-04-02"),
      ).resolves.not.toThrow();
      expect((db as any).transaction).toHaveBeenCalled();
    });
  });

  describe("confirm", () => {
    it("moves held to reserved in a transaction", async () => {
      const { repo, db } = makeRepo();
      const sqlMock = sql as unknown as jest.Mock;
      sqlMock.mockReturnValue({
        execute: jest.fn().mockResolvedValue({ rows: [] }),
      });
      await expect(
        repo.confirm("room-1", "2026-04-01", "2026-04-02"),
      ).resolves.not.toThrow();
      expect((db as any).transaction).toHaveBeenCalled();
    });
  });

  describe("release", () => {
    it("decrements reserved_rooms in a transaction and cleans up", async () => {
      const { repo, db } = makeRepo();
      const sqlMock = sql as unknown as jest.Mock;
      sqlMock.mockReturnValue({
        execute: jest.fn().mockResolvedValue({ rows: [] }),
      });
      await expect(
        repo.release("room-1", "2026-04-01", "2026-04-02"),
      ).resolves.not.toThrow();
      expect((db as any).transaction).toHaveBeenCalled();
    });
  });

  describe("eachDay (via blockDates)", () => {
    it("generates correct date range", async () => {
      const { repo, chain } = makeRepo();
      await repo.blockDates("room-1", "2026-04-01", "2026-04-04");
      // 3 days: Apr 1, Apr 2, Apr 3
      expect(chain["insertInto"]).toHaveBeenCalledTimes(3);
    });
  });

  describe("getAvailability", () => {
    it("returns mapped availability days from SQL result", async () => {
      const { repo } = makeRepo();
      const sqlMock = sql as unknown as jest.Mock;
      sqlMock.mockReturnValueOnce({
        execute: jest.fn().mockResolvedValue({
          rows: [
            {
              date: "2026-04-01",
              total_rooms: 5,
              reserved_rooms: 1,
              held_rooms: 0,
              blocked: false,
              available: true,
            },
          ],
        }),
      });
      const result = await repo.getAvailability(
        "room-1",
        "2026-04-01",
        "2026-04-02",
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "2026-04-01",
        totalRooms: 5,
        reservedRooms: 1,
        heldRooms: 0,
        blocked: false,
        available: true,
      });
    });

    it("returns empty array when no rows", async () => {
      const { repo } = makeRepo();
      const sqlMock = sql as unknown as jest.Mock;
      sqlMock.mockReturnValueOnce({
        execute: jest.fn().mockResolvedValue({ rows: [] }),
      });
      const result = await repo.getAvailability(
        "room-1",
        "2026-04-01",
        "2026-04-02",
      );
      expect(result).toEqual([]);
    });
  });

  describe("bulkCheck", () => {
    it("returns empty array when no roomIds", async () => {
      const { repo } = makeRepo();
      const result = await repo.bulkCheck([], "2026-04-01", "2026-04-07");
      expect(result).toEqual([]);
    });

    it("returns availability results mapped from SQL", async () => {
      const { repo } = makeRepo();
      const sqlMock = sql as unknown as jest.Mock;
      sqlMock.mockReturnValueOnce({
        execute: jest.fn().mockResolvedValue({
          rows: [
            { room_id: "room-1", available: true },
            { room_id: "room-2", available: false },
          ],
        }),
      });
      const result = await repo.bulkCheck(
        ["room-1", "room-2"],
        "2026-04-01",
        "2026-04-07",
      );
      expect(result).toEqual([
        { roomId: "room-1", available: true },
        { roomId: "room-2", available: false },
      ]);
    });
  });
});
