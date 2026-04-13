import { Pool } from "pg";
import { Kysely, sql } from "kysely";
import { DatabaseProvider } from "./database.provider";

const mockPoolEnd = jest.fn().mockResolvedValue(undefined);
const mockSqlExecute = jest.fn().mockResolvedValue(undefined);

jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    end: mockPoolEnd,
    on: jest.fn(),
    connect: jest.fn(),
  })),
}));

jest.mock("kysely", () => ({
  Kysely: jest.fn().mockImplementation(() => ({ __isMockKysely: true })),
  PostgresDialect: jest.fn().mockImplementation(() => ({})),
  sql: jest.fn().mockReturnValue({ execute: mockSqlExecute }),
}));

const MockPool = Pool as jest.MockedClass<typeof Pool>;
const MockKysely = Kysely as jest.MockedClass<typeof Kysely>;
const mockSql = sql as jest.MockedFunction<typeof sql>;

describe("DatabaseProvider", () => {
  let provider: DatabaseProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new DatabaseProvider();
  });

  describe("constructor", () => {
    it("creates a Kysely instance with a PostgresDialect", () => {
      expect(MockKysely).toHaveBeenCalled();
      expect(provider.db).toBeDefined();
    });

    it("uses DATABASE_URL from environment when set", () => {
      process.env["DATABASE_URL"] = "postgres://user:pass@localhost:5432/test";
      new DatabaseProvider();
      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: "postgres://user:pass@localhost:5432/test",
        }),
      );
      delete process.env["DATABASE_URL"];
    });

    it("uses ssl=false when connection string includes localhost", () => {
      process.env["DATABASE_URL"] = "postgres://user:pass@localhost:5432/test";
      new DatabaseProvider();
      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({ ssl: false }),
      );
      delete process.env["DATABASE_URL"];
    });

    it("uses ssl with rejectUnauthorized=false for non-localhost connections", () => {
      process.env["DATABASE_URL"] =
        "postgres://user:pass@remote-host:5432/prod";
      new DatabaseProvider();
      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({ ssl: { rejectUnauthorized: false } }),
      );
      delete process.env["DATABASE_URL"];
    });
  });

  describe("onModuleInit", () => {
    it("runs a SELECT 1 health check against the database", async () => {
      await provider.onModuleInit();
      expect(mockSql).toHaveBeenCalled();
    });
  });

  describe("onModuleDestroy", () => {
    it("ends the connection pool", async () => {
      mockPoolEnd.mockClear();
      await provider.onModuleDestroy();
      expect(mockPoolEnd).toHaveBeenCalled();
    });
  });
});
