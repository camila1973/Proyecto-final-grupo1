import { PriceValidationCacheRepository } from "./price-validation-cache.repository.js";

// ─── Kysely builder mock ────────────────────────────────────────────────────

function makeDb(
  opts: {
    single?: Record<string, unknown>;
  } = {},
) {
  const trx: Record<string, jest.Mock> = {};
  [
    "deleteFrom",
    "insertInto",
    "where",
    "values",
    "select",
    "selectFrom",
  ].forEach((m) => {
    trx[m] = jest.fn().mockReturnValue(trx);
  });
  trx.execute = jest.fn().mockResolvedValue([]);
  trx.executeTakeFirst = jest.fn().mockResolvedValue(opts.single);

  const db: Record<string, jest.Mock> = {};
  ["selectFrom", "where", "select"].forEach((m) => {
    db[m] = jest.fn().mockReturnValue(db);
  });
  db.execute = jest.fn().mockResolvedValue([]);
  db.executeTakeFirst = jest.fn().mockResolvedValue(opts.single);
  db.transaction = jest.fn().mockReturnValue({
    execute: jest
      .fn()
      .mockImplementation(async (cb: (trx: unknown) => Promise<void>) =>
        cb(trx),
      ),
  });

  return { db: db as any, trx: trx as any };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("PriceValidationCacheRepository", () => {
  const checkIn = new Date("2026-05-01");
  const checkOut = new Date("2026-05-04");

  describe("findCoveringStay", () => {
    it("returns the price row when a covering period exists", async () => {
      const priceRow = { price_usd: "150.00" };
      const { db } = makeDb({ single: priceRow });
      const repo = new PriceValidationCacheRepository(db);

      const result = await repo.findCoveringStay("room-1", checkIn, checkOut);

      expect(result).toEqual(priceRow);
      expect(db.where).toHaveBeenCalledWith("room_id", "=", "room-1");
    });

    it("returns undefined when no covering period exists", async () => {
      const { db } = makeDb({ single: undefined });
      const repo = new PriceValidationCacheRepository(db);

      const result = await repo.findCoveringStay("room-1", checkIn, checkOut);

      expect(result).toBeUndefined();
    });
  });

  describe("replaceForRoom", () => {
    it("executes a transaction that deletes then inserts", async () => {
      const { db, trx } = makeDb();
      const repo = new PriceValidationCacheRepository(db);

      const periods = [
        { fromDate: "2026-01-01", toDate: "2026-12-31", priceUsd: 150 },
      ];
      await repo.replaceForRoom("room-1", periods);

      expect(db.transaction).toHaveBeenCalled();
      expect(trx.deleteFrom).toHaveBeenCalledWith("price_validation_cache");
      expect(trx.insertInto).toHaveBeenCalledWith("price_validation_cache");
    });

    it("skips insert when periods array is empty", async () => {
      const { db, trx } = makeDb();
      const repo = new PriceValidationCacheRepository(db);

      await repo.replaceForRoom("room-1", []);

      expect(trx.deleteFrom).toHaveBeenCalled();
      expect(trx.insertInto).not.toHaveBeenCalled();
    });

    it("converts priceUsd number to string when inserting", async () => {
      const { db, trx } = makeDb();
      const repo = new PriceValidationCacheRepository(db);

      await repo.replaceForRoom("room-1", [
        { fromDate: "2026-01-01", toDate: "2026-12-31", priceUsd: 199.99 },
      ]);

      expect(trx.values).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ price_usd: "199.99" }),
        ]),
      );
    });
  });
});
