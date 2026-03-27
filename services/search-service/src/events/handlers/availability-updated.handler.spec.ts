import { AvailabilityUpdatedHandler } from "./availability-updated.handler.js";
import type { DatabaseService } from "../../database/database.service.js";
import type { PropertiesService } from "../../properties/properties.service.js";

// Mock kysely so that raw sql().execute() doesn't try a real DB connection
jest.mock("kysely", () => {
  const execute = jest.fn().mockResolvedValue({ rows: [] });
  const sqlTag = jest.fn().mockReturnValue({ execute });
  (sqlTag as any).raw = jest.fn().mockReturnValue({ sql: "" });
  return { sql: sqlTag, __mocks__: { execute } };
});

describe("AvailabilityUpdatedHandler", () => {
  let handler: AvailabilityUpdatedHandler;
  let dbSelectChain: Record<string, jest.Mock>;
  let mockDb: { executeQuery: jest.Mock; selectFrom: jest.Mock };
  let propertiesService: jest.Mocked<
    Pick<PropertiesService, "invalidateCityCache">
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    dbSelectChain = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn().mockResolvedValue({ city: "Cancún" }),
    } as any;
    dbSelectChain.select.mockReturnValue(dbSelectChain);
    dbSelectChain.where.mockReturnValue(dbSelectChain);

    mockDb = {
      executeQuery: jest.fn().mockResolvedValue({ rows: [] }),
      selectFrom: jest.fn().mockReturnValue(dbSelectChain),
    };

    propertiesService = {
      invalidateCityCache: jest.fn().mockResolvedValue(undefined),
    };

    const db = { db: mockDb } as unknown as DatabaseService;
    handler = new AvailabilityUpdatedHandler(
      db,
      propertiesService as unknown as PropertiesService,
    );
  });

  it("inserts each price period and invalidates city cache", async () => {
    const payload = {
      room_id: "550e8400-e29b-41d4-a716-446655440000",
      price_periods: [
        { from_date: "2026-04-01", to_date: "2026-06-30", price_usd: 200 },
        { from_date: "2026-07-01", to_date: "2026-08-31", price_usd: 240 },
      ],
    };

    await handler.handle(payload);

    // DELETE + 2 INSERTs = 3 raw sql calls
    const { sql } = await import("kysely");
    expect(sql).toHaveBeenCalledTimes(3);
    expect(propertiesService.invalidateCityCache).toHaveBeenCalledWith(
      "Cancún",
    );
  });

  it("handles empty price_periods array (only deletes)", async () => {
    const payload = {
      room_id: "550e8400-e29b-41d4-a716-446655440000",
      price_periods: [],
    };

    await handler.handle(payload);

    const { sql } = await import("kysely");
    expect(sql).toHaveBeenCalledTimes(1); // only DELETE
  });

  it("does not call invalidateCityCache when room is not found in index", async () => {
    dbSelectChain.executeTakeFirst.mockResolvedValue(undefined);

    await handler.handle({
      room_id: "550e8400-e29b-41d4-a716-446655440000",
      price_periods: [],
    });

    expect(propertiesService.invalidateCityCache).not.toHaveBeenCalled();
  });
});
