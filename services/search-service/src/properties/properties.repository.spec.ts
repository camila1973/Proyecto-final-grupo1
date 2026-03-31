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
          stars: 3,
          rating: 3.5,
          review_count: 5,
          thumbnail_url: "",
          is_active: true,
        }),
      ).resolves.not.toThrow();
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
});
