import { PropertiesRepository } from "./properties.repository.js";
import type { Kysely } from "kysely";
import type { SearchDatabase } from "../database/database.types.js";
import type { SearchPropertiesDto } from "./dto/search-properties.dto.js";

// Mock kysely so raw sql().execute() doesn't need a real DB
jest.mock("kysely", () => {
  const execute = jest.fn().mockResolvedValue({ rows: [] });
  const sqlResult = { execute, as: jest.fn().mockReturnValue(null) };
  const sqlTag = jest.fn().mockReturnValue(sqlResult);
  (sqlTag as any).raw = jest.fn().mockReturnValue({ sql: "" });
  return { sql: sqlTag };
});

const baseDto: SearchPropertiesDto = {
  city: "Lisbon",
  checkIn: "2026-04-01",
  checkOut: "2026-04-05",
  guests: 2,
  page: 1,
  pageSize: 20,
  sort: "relevance",
};

function makeQueryChain(rows: unknown[] = []) {
  const chain: Record<string, jest.Mock> = {} as any;
  chain.select = jest.fn().mockReturnValue(chain);
  chain.selectAll = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.$if = jest
    .fn()
    .mockImplementation((cond: boolean, fn: (qb: any) => any) => {
      if (cond) fn(chain);
      return chain;
    });
  chain.execute = jest.fn().mockResolvedValue(rows);
  chain.executeTakeFirst = jest.fn().mockResolvedValue(rows[0]);
  return chain;
}

function makeRepo(queryChain = makeQueryChain()) {
  const db = {
    selectFrom: jest.fn().mockReturnValue(queryChain),
  } as unknown as Kysely<SearchDatabase>;
  const repo = new PropertiesRepository(db);
  return { repo, db: db as any, queryChain };
}

describe("PropertiesRepository", () => {
  describe("findCandidates", () => {
    it("uses $if with hasCity=true when city is provided", async () => {
      const { repo, queryChain } = makeRepo();
      await repo.findCandidates({ ...baseDto, city: "Lisbon" });
      const ifCalls = queryChain.$if.mock.calls;
      expect(ifCalls[0][0]).toBe(true);
    });

    it("uses $if with hasCity=false when city is empty", async () => {
      const { repo, queryChain } = makeRepo();
      await repo.findCandidates({ ...baseDto, city: "" });
      const ifCalls = queryChain.$if.mock.calls;
      expect(ifCalls[0][0]).toBe(false);
    });
  });

  describe("upsertRoom", () => {
    it("executes a raw sql upsert", async () => {
      const { repo } = makeRepo();
      await repo.upsertRoom({
        room_id: "r1",
        property_id: "p1",
        partner_id: "pa1",
        property_name: "Hotel A",
        city: "Lisbon",
        country: "PT",
        neighborhood: null,
        lat: 38.7,
        lon: -9.14,
        room_type: "suite",
        bed_type: "king",
        view_type: "ocean",
        capacity: 2,
        amenities: ["wifi"],
        base_price_usd: 200,
        tax_rate_pct: 16,
        flat_fee_per_night_usd: 0,
        flat_fee_per_stay_usd: 0,
        stars: 4,
        rating: 4.0,
        review_count: 10,
        thumbnail_url: "",
        is_active: true,
      });

      const { sql } = await import("kysely");
      expect(sql).toHaveBeenCalled();
    });

    it("handles amenities with single quotes safely", async () => {
      const { repo } = makeRepo();
      await expect(
        repo.upsertRoom({
          room_id: "r1",
          property_id: "p1",
          partner_id: "pa1",
          property_name: "Hotel",
          city: "City",
          country: "XX",
          neighborhood: null,
          lat: 0,
          lon: 0,
          room_type: "suite",
          bed_type: "king",
          view_type: "ocean",
          capacity: 2,
          amenities: ["O'Brien suite"],
          base_price_usd: 100,
          tax_rate_pct: 16,
          flat_fee_per_night_usd: 0,
          flat_fee_per_stay_usd: 0,
          stars: 3,
          rating: 3.5,
          review_count: 5,
          thumbnail_url: "",
          is_active: true,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("deactivateRoom", () => {
    it("executes an update to set is_active=false for the given room", async () => {
      const execute = jest.fn().mockResolvedValue(undefined);
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute,
      };
      const db = {
        updateTable: jest.fn().mockReturnValue(updateChain),
      } as unknown as import("kysely").Kysely<
        import("../database/database.types.js").SearchDatabase
      >;
      const repo = new PropertiesRepository(db);

      await repo.deactivateRoom("room-1");

      expect(db.updateTable).toHaveBeenCalledWith("room_search_index");
      expect(updateChain.set).toHaveBeenCalledWith({ is_active: false });
      expect(updateChain.where).toHaveBeenCalledWith("room_id", "=", "room-1");
      expect(execute).toHaveBeenCalled();
    });
  });

  describe("findByPropertyId", () => {
    it("queries room_search_index by property_id", async () => {
      const { repo, db } = makeRepo();
      await repo.findByPropertyId("p1");
      expect(db.selectFrom).toHaveBeenCalledWith("room_search_index as rsi");
    });

    it("applies guests filter via $if when guests is provided", async () => {
      const { repo, queryChain } = makeRepo();
      await repo.findByPropertyId("p1", { guests: 2 });
      const ifCalls = queryChain.$if.mock.calls;
      // guests=2 → truthy → condition is true
      expect(ifCalls[0][0]).toBe(true);
    });

    it("skips guests filter via $if when guests is not provided", async () => {
      const { repo, queryChain } = makeRepo();
      await repo.findByPropertyId("p1", {});
      const ifCalls = queryChain.$if.mock.calls;
      expect(ifCalls[0][0]).toBe(false);
    });
  });

  describe("findRoomCity", () => {
    it("returns city when room is found", async () => {
      const chain = makeQueryChain([{ city: "Lisbon" }]);
      const { repo } = makeRepo(chain);
      const city = await repo.findRoomCity("r1");
      expect(city).toBe("Lisbon");
    });

    it("returns undefined when room is not found", async () => {
      const chain = makeQueryChain([]);
      const { repo } = makeRepo(chain);
      const city = await repo.findRoomCity("unknown");
      expect(city).toBeUndefined();
    });
  });

  describe("bulkUpdateRoomSearchIndex", () => {
    function makeBulkDb(roomIds: string[]) {
      const execute = jest
        .fn()
        .mockResolvedValueOnce(roomIds.map((id) => ({ room_id: id })));
      const selectChain: Record<string, jest.Mock> = {};
      selectChain.select = jest.fn().mockReturnThis();
      selectChain.where = jest.fn().mockReturnThis();
      selectChain.execute = execute;

      const updateChain: Record<string, jest.Mock> = {};
      updateChain.set = jest.fn().mockReturnThis();
      updateChain.where = jest.fn().mockReturnThis();
      updateChain.execute = jest.fn().mockResolvedValue(undefined);

      const db = {
        selectFrom: jest.fn().mockReturnValue(selectChain),
        updateTable: jest.fn().mockReturnValue(updateChain),
      } as unknown as Kysely<SearchDatabase>;
      return { db, selectExecute: execute, updateExecute: updateChain.execute };
    }

    it("selects room IDs then updates tax_rate_pct", async () => {
      const { db } = makeBulkDb(["r1", "r2"]);
      const repo = new PropertiesRepository(db);
      await repo.bulkUpdateRoomSearchIndex("MX", "cancún", 16);
      expect(db.selectFrom).toHaveBeenCalledWith("room_search_index");
      expect(db.updateTable).toHaveBeenCalledWith("room_search_index");
    });

    it("processes rooms in batches of 500", async () => {
      const ids = Array.from({ length: 501 }, (_, i) => `r${i}`);
      const execute = jest
        .fn()
        .mockResolvedValueOnce(ids.map((id) => ({ room_id: id })));
      const selectChain: Record<string, jest.Mock> = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute,
      };
      const updateChain: Record<string, jest.Mock> = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      const db = {
        selectFrom: jest.fn().mockReturnValue(selectChain),
        updateTable: jest.fn().mockReturnValue(updateChain),
      } as unknown as Kysely<SearchDatabase>;
      const repo = new PropertiesRepository(db);

      await repo.bulkUpdateRoomSearchIndex("MX", "cancún", 16);
      // 2 UPDATE calls (500 + 1)
      expect(updateChain.execute).toHaveBeenCalledTimes(2);
    });

    it("does nothing when no rooms match", async () => {
      const { db } = makeBulkDb([]);
      const repo = new PropertiesRepository(db);
      await repo.bulkUpdateRoomSearchIndex("MX", "cancún", 16);
      expect(db.updateTable).not.toHaveBeenCalled();
    });
  });

  describe("bulkUpdateFlatFees", () => {
    it("selects room IDs by partner_id then updates flat fee columns", async () => {
      const selectExecute = jest
        .fn()
        .mockResolvedValueOnce([{ room_id: "r1" }]);
      const selectChain: Record<string, jest.Mock> = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: selectExecute,
      };
      const updateChain: Record<string, jest.Mock> = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      const db = {
        selectFrom: jest.fn().mockReturnValue(selectChain),
        updateTable: jest.fn().mockReturnValue(updateChain),
      } as unknown as Kysely<SearchDatabase>;
      const repo = new PropertiesRepository(db);

      await repo.bulkUpdateFlatFees("partner-1", 25, 50);
      expect(db.selectFrom).toHaveBeenCalledWith("room_search_index");
      expect(db.updateTable).toHaveBeenCalledWith("room_search_index");
      expect(updateChain.execute).toHaveBeenCalledTimes(1);
    });

    it("does nothing when no rooms match", async () => {
      const selectExecute = jest.fn().mockResolvedValueOnce([]);
      const selectChain: Record<string, jest.Mock> = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: selectExecute,
      };
      const db = {
        selectFrom: jest.fn().mockReturnValue(selectChain),
        updateTable: jest.fn(),
      } as unknown as Kysely<SearchDatabase>;
      const repo = new PropertiesRepository(db);

      await repo.bulkUpdateFlatFees("partner-1", 25, 50);
      expect(db.updateTable).not.toHaveBeenCalled();
    });
  });
});
