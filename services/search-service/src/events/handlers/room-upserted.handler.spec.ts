import { RoomUpsertedHandler } from "./room-upserted.handler.js";
import type { PropertiesRepository } from "../../properties/properties.repository.js";
import type { PropertiesService } from "../../properties/properties.service.js";
import type { RoomUpsertedPayload } from "./room-upserted.handler.js";

const makePayload = (
  overrides: Partial<RoomUpsertedPayload> = {},
): RoomUpsertedPayload => ({
  roomId: "550e8400-e29b-41d4-a716-446655440000",
  propertyId: "660e8400-e29b-41d4-a716-446655440001",
  partnerId: "770e8400-e29b-41d4-a716-446655440002",
  propertyName: "Grand Hotel",
  city: "Cancún",
  country: "Mexico",
  neighborhood: null,
  lat: 21.17,
  lon: -86.84,
  roomType: "suite",
  bedType: "king",
  viewType: "ocean",
  capacity: 2,
  totalRooms: 10,
  amenities: ["wifi", "pool"],
  basePriceUsd: 350,
  stars: 5,
  rating: 4.8,
  reviewCount: 320,
  thumbnailUrl: "https://example.com/img.jpg",
  isActive: true,
  ...overrides,
});

describe("RoomUpsertedHandler", () => {
  let handler: RoomUpsertedHandler;
  let repo: jest.Mocked<Pick<PropertiesRepository, "upsertRoom">>;
  let propertiesService: jest.Mocked<
    Pick<PropertiesService, "invalidateCityCache">
  >;

  beforeEach(() => {
    repo = { upsertRoom: jest.fn().mockResolvedValue(undefined) };
    propertiesService = {
      invalidateCityCache: jest.fn().mockResolvedValue(undefined),
    };

    handler = new RoomUpsertedHandler(
      repo as unknown as PropertiesRepository,
      propertiesService as unknown as PropertiesService,
    );
  });

  it("calls repo.upsertRoom with mapped snake_case record and invalidates the city cache", async () => {
    const payload = makePayload();
    await handler.handle(payload);

    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        room_id: payload.roomId,
        property_id: payload.propertyId,
        partner_id: payload.partnerId,
        property_name: payload.propertyName,
        city: payload.city,
        country: payload.country,
        room_type: payload.roomType,
        bed_type: payload.bedType,
        view_type: payload.viewType,
        capacity: payload.capacity,
        amenities: payload.amenities,
        base_price_usd: payload.basePriceUsd,
        stars: payload.stars,
        rating: payload.rating,
        review_count: payload.reviewCount,
        thumbnail_url: payload.thumbnailUrl,
        is_active: payload.isActive,
      }),
    );
    expect(propertiesService.invalidateCityCache).toHaveBeenCalledWith(
      "Cancún",
    );
  });

  it("handles a payload with null neighborhood without throwing", async () => {
    await expect(
      handler.handle(makePayload({ neighborhood: null })),
    ).resolves.not.toThrow();
  });

  it("handles amenities with single quotes without throwing", async () => {
    await expect(
      handler.handle(makePayload({ amenities: ["O'Brien suite", "pool"] })),
    ).resolves.not.toThrow();
  });

  it("handles empty amenities array without throwing", async () => {
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
