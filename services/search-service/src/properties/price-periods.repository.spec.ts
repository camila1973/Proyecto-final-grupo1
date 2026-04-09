// Mock kysely so raw sql().execute() doesn't need a real DB
jest.mock("kysely", () => {
  const execute = jest.fn().mockResolvedValue({ rows: [] });
  const sqlTag = jest.fn().mockReturnValue({ execute });
  (sqlTag as any).raw = jest.fn().mockReturnValue({ sql: "" });
  return { sql: sqlTag };
});

import { PricePeriodsRepository } from "./price-periods.repository.js";
import type { Kysely } from "kysely";
import type { SearchDatabase } from "../database/database.types.js";

const ROOM_ID = "550e8400-e29b-41d4-a716-446655440000";

function makeRepo() {
  const db = {} as unknown as Kysely<SearchDatabase>;
  return new PricePeriodsRepository(db);
}

describe("PricePeriodsRepository", () => {
  beforeEach(() => jest.clearAllMocks());

  it("executes DELETE + one INSERT per period", async () => {
    const repo = makeRepo();
    await repo.replaceForRoom(ROOM_ID, [
      { from_date: "2026-04-01", to_date: "2026-06-30", price_usd: 200 },
      { from_date: "2026-07-01", to_date: "2026-08-31", price_usd: 240 },
    ]);

    const { sql } = await import("kysely");
    // DELETE + 2 INSERTs = 3 calls
    expect(sql).toHaveBeenCalledTimes(3);
  });

  it("executes only DELETE when periods is empty", async () => {
    const repo = makeRepo();
    await repo.replaceForRoom(ROOM_ID, []);

    const { sql } = await import("kysely");
    expect(sql).toHaveBeenCalledTimes(1);
  });
});
