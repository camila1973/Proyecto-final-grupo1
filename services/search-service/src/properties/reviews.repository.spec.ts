import { ReviewsRepository } from "./reviews.repository.js";
import type { Kysely } from "kysely";
import type { SearchDatabase } from "../database/database.types.js";

function makeQueryChain(rows: unknown[] = [], aggregateRow: unknown = null) {
  const chain: Record<string, jest.Mock> = {} as any;
  chain.select = jest.fn().mockReturnValue(chain);
  chain.selectAll = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.orderBy = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.offset = jest.fn().mockReturnValue(chain);
  chain.$if = jest
    .fn()
    .mockImplementation((cond: boolean, fn: (qb: any) => any) => {
      if (cond) fn(chain);
      return chain;
    });
  chain.execute = jest.fn().mockResolvedValue(rows);
  chain.executeTakeFirst = jest.fn().mockResolvedValue(aggregateRow);
  return chain;
}

function makeRepo(chain = makeQueryChain()) {
  const db = {
    selectFrom: jest.fn().mockReturnValue(chain),
  } as unknown as Kysely<SearchDatabase>;
  const repo = new ReviewsRepository(db);
  return { repo, db: db as any, chain };
}

describe("ReviewsRepository", () => {
  describe("findByPropertyId", () => {
    it("queries property_reviews with limit/offset for pagination", async () => {
      const { repo, chain } = makeRepo();
      await repo.findByPropertyId("p1", { page: 2, pageSize: 5 });
      expect(chain.where).toHaveBeenCalledWith("property_id", "=", "p1");
      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(chain.offset).toHaveBeenCalledWith(5);
    });

    it("orders by created_at descending", async () => {
      const { repo, chain } = makeRepo();
      await repo.findByPropertyId("p1", { page: 1, pageSize: 5 });
      expect(chain.orderBy).toHaveBeenCalledWith("created_at", "desc");
    });

    it("filters by language when provided", async () => {
      const { repo, chain } = makeRepo();
      await repo.findByPropertyId("p1", {
        page: 1,
        pageSize: 5,
        language: "en",
      });
      const ifCalls = chain.$if.mock.calls;
      expect(ifCalls[0][0]).toBe(true);
    });

    it("skips language filter when not provided", async () => {
      const { repo, chain } = makeRepo();
      await repo.findByPropertyId("p1", { page: 1, pageSize: 5 });
      const ifCalls = chain.$if.mock.calls;
      expect(ifCalls[0][0]).toBe(false);
    });
  });

  describe("aggregate", () => {
    it("returns zero when no rows", async () => {
      const { repo } = makeRepo(makeQueryChain([], { count: 0, avg: null }));
      const result = await repo.aggregate("p1");
      expect(result).toEqual({ averageRating: 0, totalReviews: 0 });
    });

    it("parses count and avg from the aggregate row", async () => {
      const { repo } = makeRepo(
        makeQueryChain([], { count: "12", avg: "4.56" }),
      );
      const result = await repo.aggregate("p1");
      expect(result.totalReviews).toBe(12);
      expect(result.averageRating).toBeCloseTo(4.56, 2);
    });
  });
});
