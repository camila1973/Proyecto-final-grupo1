import { runMigrations } from "./migrate";

// Mock pg
jest.mock("pg", () => {
  const mockEnd = jest.fn().mockResolvedValue(undefined);
  const MockPool = jest.fn().mockImplementation(() => ({ end: mockEnd }));
  return { Pool: MockPool };
});

// Mock kysely
jest.mock("kysely", () => {
  const MockKysely = jest.fn().mockImplementation(() => ({}));
  const MockPostgresDialect = jest.fn();
  const MockFileMigrationProvider = jest.fn();
  const migrateToLatest = jest.fn();
  const MockMigrator = jest.fn().mockImplementation(() => ({
    migrateToLatest,
  }));
  return {
    Kysely: MockKysely,
    PostgresDialect: MockPostgresDialect,
    FileMigrationProvider: MockFileMigrationProvider,
    Migrator: MockMigrator,
    __migrateToLatest: migrateToLatest,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const kyselyMock = require("kysely");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require("pg");

describe("runMigrations", () => {
  let migrateToLatest: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DATABASE_URL;
    migrateToLatest = kyselyMock.__migrateToLatest;
    migrateToLatest.mockReset();
  });

  it("creates pool with ssl:false when connectionString contains localhost (default URL)", async () => {
    // Default connection string contains 'localhost', so ssl should be false
    migrateToLatest.mockResolvedValue({ results: [], error: undefined });

    await runMigrations();

    expect(Pool).toHaveBeenCalledWith(expect.objectContaining({ ssl: false }));
  });

  it("creates pool with ssl rejectUnauthorized:false for non-localhost URLs", async () => {
    process.env.DATABASE_URL =
      "postgres://user:pass@db.example.com:5432/travelhub";
    migrateToLatest.mockResolvedValue({ results: [], error: undefined });

    await runMigrations();

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({ ssl: { rejectUnauthorized: false } }),
    );
  });

  it("logs Applied for each Success migration result", async () => {
    migrateToLatest.mockResolvedValue({
      results: [
        { status: "Success", migrationName: "001_init" },
        { status: "Success", migrationName: "002_users" },
      ],
      error: undefined,
    });

    await runMigrations();

    // pool.end should be called from finally block
    const poolInstance = Pool.mock.results[0].value;
    expect(poolInstance.end).toHaveBeenCalled();
  });

  it("logs Failed for Error migration results", async () => {
    migrateToLatest.mockResolvedValue({
      results: [
        { status: "Error", migrationName: "003_bad" },
        { status: "NotExecuted", migrationName: "004_skip" },
      ],
      error: undefined,
    });

    await runMigrations();

    const poolInstance = Pool.mock.results[0].value;
    expect(poolInstance.end).toHaveBeenCalled();
  });

  it("handles undefined results (uses ?? [] fallback)", async () => {
    migrateToLatest.mockResolvedValue({
      results: undefined,
      error: undefined,
    });

    await expect(runMigrations()).resolves.toBeUndefined();

    const poolInstance = Pool.mock.results[0].value;
    expect(poolInstance.end).toHaveBeenCalled();
  });

  it("rethrows when migrator returns an Error instance", async () => {
    migrateToLatest.mockResolvedValue({
      results: [],
      error: new Error("migration boom"),
    });

    await expect(runMigrations()).rejects.toThrow("migration boom");

    // Pool should still be closed (finally)
    const poolInstance = Pool.mock.results[0].value;
    expect(poolInstance.end).toHaveBeenCalled();
  });

  it("wraps non-Error error values into Error('Migration failed')", async () => {
    migrateToLatest.mockResolvedValue({
      results: [],
      error: "string-error-not-an-instance",
    });

    await expect(runMigrations()).rejects.toThrow("Migration failed");

    const poolInstance = Pool.mock.results[0].value;
    expect(poolInstance.end).toHaveBeenCalled();
  });

  it("always closes the pool even if migrateToLatest throws", async () => {
    migrateToLatest.mockRejectedValue(new Error("connection lost"));

    await expect(runMigrations()).rejects.toThrow("connection lost");

    const poolInstance = Pool.mock.results[0].value;
    expect(poolInstance.end).toHaveBeenCalled();
  });
});
