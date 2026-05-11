import { DatabaseProvider } from "./database.provider";

// Mock pg and kysely so the provider never touches a real database
jest.mock("pg", () => {
  const mockEnd = jest.fn().mockResolvedValue(undefined);
  const MockPool = jest.fn().mockImplementation(() => ({ end: mockEnd }));
  return { Pool: MockPool, types: { setTypeParser: jest.fn() } };
});

jest.mock("kysely", () => {
  const mockExecute = jest.fn().mockResolvedValue(undefined);
  // sql template tag mock
  const sql = Object.assign(
    jest.fn().mockReturnValue({ execute: mockExecute }),
    { execute: mockExecute },
  );
  const MockKysely = jest.fn().mockImplementation(() => ({}));
  const MockPostgresDialect = jest.fn();
  return { Kysely: MockKysely, PostgresDialect: MockPostgresDialect, sql };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require("pg");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sql } = require("kysely");

describe("DatabaseProvider", () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.DATABASE_URL;
  });

  it("creates the pool with ssl:false when DATABASE_URL contains localhost", () => {
    process.env.DATABASE_URL =
      "postgresql://user:pass@localhost:5432/notification_db";
    new DatabaseProvider();

    expect(Pool).toHaveBeenCalledWith(expect.objectContaining({ ssl: false }));
  });

  it("creates the pool with ssl rejectUnauthorized:false for non-localhost URLs", () => {
    process.env.DATABASE_URL =
      "postgresql://user:pass@db.example.com:5432/notification_db";
    new DatabaseProvider();

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: { rejectUnauthorized: false },
      }),
    );
  });

  it("onModuleInit executes a health-check query", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    const provider = new DatabaseProvider();
    await provider.onModuleInit();

    expect(sql).toHaveBeenCalled();
  });

  it("onModuleDestroy ends the pool", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    const provider = new DatabaseProvider();
    const poolInstance = Pool.mock.results[0].value;

    await provider.onModuleDestroy();

    expect(poolInstance.end).toHaveBeenCalled();
  });
});
