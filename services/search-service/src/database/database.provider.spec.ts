// ─── kysely mock ──────────────────────────────────────────────────────────────
// Must be hoisted before DatabaseProvider imports Kysely.

const mockExecute = jest.fn().mockResolvedValue({});
const mockDestroy = jest.fn().mockResolvedValue(undefined);
const mockPoolEnd = jest.fn().mockResolvedValue(undefined);

jest.mock("kysely", () => {
  const sqlTag = (_strings: TemplateStringsArray, ..._values: unknown[]) => ({
    execute: mockExecute,
  });
  return {
    Kysely: jest.fn(() => ({ destroy: mockDestroy })),
    PostgresDialect: jest.fn(),
    sql: sqlTag,
  };
});

jest.mock("pg", () => ({
  Pool: jest.fn(() => ({ end: mockPoolEnd })),
}));

import { DatabaseProvider } from "./database.provider.js";
import { Pool } from "pg";

describe("DatabaseProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute.mockResolvedValue({});
    mockDestroy.mockResolvedValue(undefined);
    mockPoolEnd.mockResolvedValue(undefined);
  });

  it("creates pool with ssl disabled for localhost connections", () => {
    delete process.env.DATABASE_URL;
    new DatabaseProvider();

    expect(Pool).toHaveBeenCalledWith(expect.objectContaining({ ssl: false }));
  });

  it("creates pool with ssl enabled for non-localhost connections", () => {
    process.env.DATABASE_URL =
      "postgres://user:pass@cloud-host:5432/search_service";
    new DatabaseProvider();

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: { rejectUnauthorized: false },
      }),
    );
    delete process.env.DATABASE_URL;
  });

  it("onModuleInit executes SELECT 1 to verify connectivity", async () => {
    delete process.env.DATABASE_URL;
    const provider = new DatabaseProvider();

    await provider.onModuleInit();

    expect(mockExecute).toHaveBeenCalled();
  });

  it("onModuleDestroy destroys the db and ends the pool", async () => {
    delete process.env.DATABASE_URL;
    const provider = new DatabaseProvider();

    await provider.onModuleDestroy();

    expect(mockDestroy).toHaveBeenCalled();
    expect(mockPoolEnd).toHaveBeenCalled();
  });
});
