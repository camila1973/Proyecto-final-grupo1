// Mock pg and kysely before any imports so the service constructor doesn't open a real connection
const mockPoolEnd = jest.fn().mockResolvedValue(undefined);
const mockPool = { end: mockPoolEnd };
jest.mock("pg", () => ({ Pool: jest.fn().mockImplementation(() => mockPool) }));

const mockDbDestroy = jest.fn().mockResolvedValue(undefined);
const mockExecuteQuery = jest.fn().mockResolvedValue({ rows: [] });
const mockKyselyInstance = {
  destroy: mockDbDestroy,
  executeQuery: mockExecuteQuery,
};
jest.mock("kysely", () => ({
  Kysely: jest.fn().mockImplementation(() => mockKyselyInstance),
  PostgresDialect: jest.fn().mockImplementation(() => ({})),
  sql: Object.assign(
    jest.fn().mockReturnValue({ execute: jest.fn().mockResolvedValue({}) }),
    { raw: jest.fn() },
  ),
}));

import { DatabaseService } from "./database.service.js";

describe("DatabaseService", () => {
  let service: DatabaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbDestroy.mockResolvedValue(undefined);
    mockPoolEnd.mockResolvedValue(undefined);
    const { sql } = jest.requireMock("kysely");
    sql.mockReturnValue({ execute: jest.fn().mockResolvedValue({}) });
    service = new DatabaseService();
  });

  it("exposes a db property after construction", () => {
    expect(service.db).toBeDefined();
  });

  it("onModuleInit runs a connectivity check (SELECT 1)", async () => {
    await service.onModuleInit();
    const { sql } = jest.requireMock("kysely");
    expect(sql).toHaveBeenCalled();
  });

  it("onModuleDestroy destroys kysely and ends the pool", async () => {
    await service.onModuleDestroy();
    expect(mockDbDestroy).toHaveBeenCalled();
    expect(mockPoolEnd).toHaveBeenCalled();
  });
});
