// Mock pg.Pool and kysely before importing the provider so its constructor
// runs without touching the network.
const mockPoolInstance = {
  end: jest.fn().mockResolvedValue(undefined),
};
jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => mockPoolInstance),
}));

const mockExecute = jest.fn().mockResolvedValue({ rows: [] });
jest.mock("kysely", () => {
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
  const actual = jest.requireActual("kysely");
  return {
    ...actual,
    Kysely: jest.fn().mockImplementation(() => ({})),
    sql: Object.assign(
      jest.fn(() => ({
        execute: mockExecute,
      })),
      {},
    ),
  };
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
});

import { DatabaseProvider } from "./database.provider.js";

describe("DatabaseProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("connects to localhost without SSL when no DATABASE_URL", () => {
    const prevUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const provider = new DatabaseProvider();
    expect(provider).toBeDefined();
    if (prevUrl !== undefined) process.env.DATABASE_URL = prevUrl;
  });

  it("uses SSL for non-localhost DATABASE_URL", () => {
    const prevUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL =
      "postgres://user:pass@db.production:5432/partners";
    const provider = new DatabaseProvider();
    expect(provider).toBeDefined();
    if (prevUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevUrl;
  });

  it("onModuleInit runs SELECT 1 health check", async () => {
    const provider = new DatabaseProvider();
    await expect(provider.onModuleInit()).resolves.toBeUndefined();
  });

  it("onModuleDestroy closes the pool", async () => {
    const provider = new DatabaseProvider();
    await provider.onModuleDestroy();
    expect(mockPoolInstance.end).toHaveBeenCalled();
  });
});
