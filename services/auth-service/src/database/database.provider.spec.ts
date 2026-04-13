import { Pool } from "pg";
import { Kysely, sql } from "kysely";
import { DatabaseProvider } from "./database.provider";

jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    connect: jest.fn(),
  })),
}));

jest.mock("kysely", () => ({
  Kysely: jest.fn().mockImplementation(() => ({
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
  PostgresDialect: jest.fn().mockImplementation(() => ({})),
  sql: jest
    .fn()
    .mockReturnValue({ execute: jest.fn().mockResolvedValue(undefined) }),
}));

const MockPool = Pool as jest.MockedClass<typeof Pool>;
const MockKysely = Kysely as jest.MockedClass<typeof Kysely>;
const mockSql = sql as jest.MockedFunction<typeof sql>;

describe("DatabaseProvider", () => {
  let provider: DatabaseProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    MockPool.mockImplementation(
      () =>
        ({
          end: jest.fn().mockResolvedValue(undefined),
          on: jest.fn(),
          connect: jest.fn(),
        }) as unknown as Pool,
    );
    MockKysely.mockImplementation(
      () =>
        ({
          destroy: jest.fn().mockResolvedValue(undefined),
        }) as unknown as Kysely<any>,
    );
    mockSql.mockReturnValue({
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof sql>);
    provider = new DatabaseProvider();
  });

  describe("constructor", () => {
    it("creates a Kysely instance", () => {
      expect(MockKysely).toHaveBeenCalled();
      expect(provider.db).toBeDefined();
    });

    it("uses DATABASE_URL when set", () => {
      process.env["DATABASE_URL"] = "postgres://user:pass@localhost:5432/test";
      new DatabaseProvider();
      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: "postgres://user:pass@localhost:5432/test",
        }),
      );
      delete process.env["DATABASE_URL"];
    });

    it("uses ssl=false for localhost connections", () => {
      process.env["DATABASE_URL"] = "postgres://user:pass@localhost:5432/test";
      new DatabaseProvider();
      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({ ssl: false }),
      );
      delete process.env["DATABASE_URL"];
    });

    it("uses ssl with rejectUnauthorized=false for remote connections", () => {
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
    it("runs a SELECT 1 health check", async () => {
      await provider.onModuleInit();
      expect(mockSql).toHaveBeenCalled();
    });
  });

  describe("onModuleDestroy", () => {
    it("destroys the db and ends the pool", async () => {
      const mockDestroy = jest.fn().mockResolvedValue(undefined);
      const mockEnd = jest.fn().mockResolvedValue(undefined);
      MockKysely.mockImplementationOnce(
        () => ({ destroy: mockDestroy }) as unknown as Kysely<any>,
      );
      MockPool.mockImplementationOnce(
        () => ({ end: mockEnd }) as unknown as Pool,
      );
      const p = new DatabaseProvider();
      await p.onModuleDestroy();
      expect(mockDestroy).toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalled();
    });
  });
});
