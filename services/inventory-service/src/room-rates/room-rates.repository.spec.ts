import { RoomRatesRepository } from "./room-rates.repository";
import type { Kysely } from "kysely";
import type { Database } from "../database/database.types";

const NOW = new Date("2026-01-01T00:00:00Z");

const RATE_ROW = {
  id: "rate-1",
  room_id: "room-1",
  from_date: "2026-04-01",
  to_date: "2026-04-10",
  price_usd: "150.00",
  currency: "USD",
  created_at: NOW,
};

function makeChain(
  resolved: {
    execute?: any;
    executeTakeFirst?: any;
    executeTakeFirstOrThrow?: any;
  } = {},
) {
  const chain: Record<string, any> = {};
  for (const m of [
    "selectFrom",
    "insertInto",
    "deleteFrom",
    "selectAll",
    "where",
    "values",
    "returningAll",
    "set",
    "orderBy",
  ]) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  // onConflict takes a callback
  chain["onConflict"] = jest.fn().mockImplementation((cb: (oc: any) => any) => {
    const oc = {
      columns: jest.fn().mockReturnThis(),
      doUpdateSet: jest.fn().mockReturnThis(),
    };
    cb(oc);
    return chain;
  });
  chain["execute"] = jest.fn().mockResolvedValue(resolved.execute ?? []);
  chain["executeTakeFirst"] = jest
    .fn()
    .mockResolvedValue(resolved.executeTakeFirst ?? undefined);
  chain["executeTakeFirstOrThrow"] = jest
    .fn()
    .mockResolvedValue(resolved.executeTakeFirstOrThrow ?? undefined);
  return chain as unknown as Kysely<Database>;
}

function makeRepo(db: Kysely<Database>) {
  return new RoomRatesRepository(db as any);
}

describe("RoomRatesRepository", () => {
  describe("findByRoom", () => {
    it("returns rates for a room without date filters", async () => {
      const db = makeChain({ execute: [RATE_ROW] });
      const repo = makeRepo(db);
      const result = await repo.findByRoom("room-1");
      expect(result).toHaveLength(1);
      expect((db as any).where).toHaveBeenCalledWith("room_id", "=", "room-1");
    });

    it("applies fromDate filter when provided", async () => {
      const db = makeChain({ execute: [RATE_ROW] });
      const repo = makeRepo(db);
      await repo.findByRoom("room-1", "2026-04-01");
      expect((db as any).where).toHaveBeenCalledWith(
        "to_date",
        ">",
        "2026-04-01",
      );
    });

    it("applies toDate filter when provided", async () => {
      const db = makeChain({ execute: [RATE_ROW] });
      const repo = makeRepo(db);
      await repo.findByRoom("room-1", undefined, "2026-04-10");
      expect((db as any).where).toHaveBeenCalledWith(
        "from_date",
        "<",
        "2026-04-10",
      );
    });

    it("applies both filters when provided", async () => {
      const db = makeChain({ execute: [RATE_ROW] });
      const repo = makeRepo(db);
      await repo.findByRoom("room-1", "2026-04-01", "2026-04-10");
      expect((db as any).where).toHaveBeenCalledWith(
        "to_date",
        ">",
        "2026-04-01",
      );
      expect((db as any).where).toHaveBeenCalledWith(
        "from_date",
        "<",
        "2026-04-10",
      );
    });
  });

  describe("findOverlapping", () => {
    it("queries overlapping rates by date range", async () => {
      const db = makeChain({ execute: [RATE_ROW] });
      const repo = makeRepo(db);
      const result = await repo.findOverlapping(
        "room-1",
        "2026-04-01",
        "2026-04-10",
      );
      expect(result).toHaveLength(1);
      expect((db as any).where).toHaveBeenCalledWith(
        "from_date",
        "<",
        "2026-04-10",
      );
      expect((db as any).where).toHaveBeenCalledWith(
        "to_date",
        ">",
        "2026-04-01",
      );
    });
  });

  describe("findById", () => {
    it("returns rate by id", async () => {
      const db = makeChain({ executeTakeFirst: RATE_ROW });
      const repo = makeRepo(db);
      const result = await repo.findById("rate-1");
      expect(result?.id).toBe("rate-1");
    });

    it("returns undefined when not found", async () => {
      const db = makeChain({ executeTakeFirst: undefined });
      const repo = makeRepo(db);
      const result = await repo.findById("missing");
      expect(result).toBeUndefined();
    });
  });

  describe("create", () => {
    it("inserts and returns the new rate", async () => {
      const db = makeChain({ executeTakeFirstOrThrow: RATE_ROW });
      const repo = makeRepo(db);
      const result = await repo.create({
        room_id: "room-1",
        from_date: new Date("2026-04-01"),
        to_date: new Date("2026-04-10"),
        price_usd: "150.00",
        currency: "USD",
      });
      expect(result.id).toBe("rate-1");
      expect((db as any).insertInto).toHaveBeenCalledWith("inv_room_rates");
    });
  });

  describe("delete", () => {
    it("deletes a rate by id", async () => {
      const db = makeChain({ execute: [] });
      const repo = makeRepo(db);
      await repo.delete("rate-1");
      expect((db as any).deleteFrom).toHaveBeenCalledWith("inv_room_rates");
      expect((db as any).where).toHaveBeenCalledWith("id", "=", "rate-1");
    });
  });

  describe("deleteMany", () => {
    it("does nothing when ids array is empty", async () => {
      const db = makeChain({ execute: [] });
      const repo = makeRepo(db);
      await repo.deleteMany([]);
      expect((db as any).deleteFrom).not.toHaveBeenCalled();
    });

    it("deletes multiple rates when ids are provided", async () => {
      const db = makeChain({ execute: [] });
      const repo = makeRepo(db);
      await repo.deleteMany(["rate-1", "rate-2"]);
      expect((db as any).deleteFrom).toHaveBeenCalledWith("inv_room_rates");
      expect((db as any).where).toHaveBeenCalledWith("id", "in", [
        "rate-1",
        "rate-2",
      ]);
    });
  });
});
