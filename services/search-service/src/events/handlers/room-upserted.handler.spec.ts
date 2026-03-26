import { RoomUpsertedHandler } from "./room-upserted.handler.js";
import type { DatabaseService } from "../../database/database.service.js";
import type { PropertiesService } from "../../properties/properties.service.js";
import type { RoomUpsertedPayload } from "./room-upserted.handler.js";

// Mock kysely so raw sql().execute() doesn't need a real DB
jest.mock("kysely", () => {
  const execute = jest.fn().mockResolvedValue({ rows: [] });
  const sqlTag = jest.fn().mockReturnValue({ execute });
  (sqlTag as any).raw = jest.fn().mockReturnValue({ sql: "" });
  return { sql: sqlTag };
});

const makePayload = (
  overrides: Partial<RoomUpsertedPayload> = {},
): RoomUpsertedPayload => ({
  room_id: "550e8400-e29b-41d4-a716-446655440000",
  property_id: "660e8400-e29b-41d4-a716-446655440001",
  partner_id: "770e8400-e29b-41d4-a716-446655440002",
  property_name: "Grand Hotel",
  city: "Cancún",
  country: "Mexico",
  neighborhood: null,
  lat: 21.17,
  lon: -86.84,
  room_type: "suite",
  bed_type: "king",
  view_type: "ocean",
  capacity: 2,
  amenities: ["wifi", "pool"],
  base_price_usd: 350,
  stars: 5,
  rating: 4.8,
  review_count: 320,
  thumbnail_url: "https://example.com/img.jpg",
  is_active: true,
  ...overrides,
});

describe("RoomUpsertedHandler", () => {
  let handler: RoomUpsertedHandler;
  let mockExecuteQuery: jest.Mock;
  let propertiesService: jest.Mocked<
    Pick<PropertiesService, "invalidateCityCache">
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    mockExecuteQuery = jest.fn().mockResolvedValue({ rows: [] });
    const db = {
      db: { executeQuery: mockExecuteQuery },
    } as unknown as DatabaseService;
    propertiesService = {
      invalidateCityCache: jest.fn().mockResolvedValue(undefined),
    };

    handler = new RoomUpsertedHandler(
      db,
      propertiesService as unknown as PropertiesService,
    );
  });

  it("executes an upsert SQL and invalidates the city cache", async () => {
    const payload = makePayload();

    await handler.handle(payload);

    const { sql } = await import("kysely");
    expect(sql).toHaveBeenCalledTimes(1);
    expect(propertiesService.invalidateCityCache).toHaveBeenCalledWith(
      "Cancún",
    );
  });

  it("handles a payload with null neighborhood without throwing", async () => {
    await expect(
      handler.handle(makePayload({ neighborhood: null })),
    ).resolves.not.toThrow();
  });

  it("handles amenities with single quotes safely (SQL injection prevention)", async () => {
    await expect(
      handler.handle(makePayload({ amenities: ["O'Brien suite", "pool"] })),
    ).resolves.not.toThrow();
  });

  it("handles empty amenities array", async () => {
    await expect(
      handler.handle(makePayload({ amenities: [] })),
    ).resolves.not.toThrow();
  });

  it("invalidates the correct city", async () => {
    await handler.handle(makePayload({ city: "Mexico City" }));
    expect(propertiesService.invalidateCityCache).toHaveBeenCalledWith(
      "Mexico City",
    );
  });
});
