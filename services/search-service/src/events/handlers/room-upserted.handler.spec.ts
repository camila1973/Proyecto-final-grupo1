import { RoomUpsertedHandler } from "./room-upserted.handler.js";
import type { PropertiesRepository } from "../../properties/properties.repository.js";
import type { PropertiesService } from "../../properties/properties.service.js";
import type { BookingClientService } from "../../booking/booking-client.service.js";
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
  let bookingClient: jest.Mocked<
    Pick<BookingClientService, "getTaxRules" | "getPartnerFees">
  >;

  beforeEach(() => {
    repo = {
      upsertRoom: jest.fn().mockResolvedValue(undefined),
    };
    propertiesService = {
      invalidateCityCache: jest.fn().mockResolvedValue(undefined),
    };
    bookingClient = {
      getTaxRules: jest.fn().mockResolvedValue([]),
      getPartnerFees: jest.fn().mockResolvedValue([]),
    };

    handler = new RoomUpsertedHandler(
      repo as unknown as PropertiesRepository,
      propertiesService as unknown as PropertiesService,
      bookingClient as unknown as BookingClientService,
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
        tax_rate_pct: 0,
        flat_fee_per_night_usd: 0,
        flat_fee_per_stay_usd: 0,
      }),
    );
    expect(propertiesService.invalidateCityCache).toHaveBeenCalledWith(
      "Cancún",
    );
  });

  it("populates tax_rate_pct from booking-service tax rules", async () => {
    bookingClient.getTaxRules.mockResolvedValue([
      {
        id: "t1",
        country: "Mexico",
        city: null,
        tax_name: "IVA",
        tax_type: "PERCENTAGE",
        rate: "16",
        flat_amount: null,
        currency: "USD",
        is_active: true,
      },
    ]);

    await handler.handle(makePayload());

    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({ tax_rate_pct: 16 }),
    );
  });

  it("populates flat fee columns from booking-service partner fees", async () => {
    bookingClient.getPartnerFees.mockResolvedValue([
      {
        id: "f1",
        partner_id: "p1",
        fee_name: "Resort Fee",
        fee_type: "FLAT_PER_NIGHT",
        rate: null,
        flat_amount: "25",
        currency: "USD",
        is_active: true,
      },
      {
        id: "f2",
        partner_id: "p1",
        fee_name: "Cleaning Fee",
        fee_type: "FLAT_PER_STAY",
        rate: null,
        flat_amount: "50",
        currency: "USD",
        is_active: true,
      },
    ]);

    await handler.handle(makePayload());

    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        flat_fee_per_night_usd: 25,
        flat_fee_per_stay_usd: 50,
      }),
    );
  });

  it("defaults flat fees to 0 when getPartnerFees throws", async () => {
    bookingClient.getPartnerFees.mockRejectedValue(
      new Error("booking-service down"),
    );

    await handler.handle(makePayload());

    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        flat_fee_per_night_usd: 0,
        flat_fee_per_stay_usd: 0,
      }),
    );
  });

  it("defaults tax_rate_pct to 0 when getTaxRules throws", async () => {
    bookingClient.getTaxRules.mockRejectedValue(
      new Error("booking-service down"),
    );

    await handler.handle(makePayload());

    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({ tax_rate_pct: 0 }),
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

  it("defaults lat and lon to 0 when null", async () => {
    await handler.handle(makePayload({ lat: null, lon: null }));
    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 0, lon: 0 }),
    );
  });

  it("defaults stars to 0 when null", async () => {
    await handler.handle(makePayload({ stars: null }));
    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({ stars: 0 }),
    );
  });

  it("city-specific tax rule overrides country-level rule with same name", async () => {
    bookingClient.getTaxRules.mockResolvedValue([
      {
        id: "t1",
        country: "Mexico",
        city: null,
        tax_name: "IVA",
        tax_type: "PERCENTAGE",
        rate: "16",
        flat_amount: null,
        currency: "USD",
        is_active: true,
      },
      {
        id: "t2",
        country: "Mexico",
        city: "cancún",
        tax_name: "IVA",
        tax_type: "PERCENTAGE",
        rate: "14",
        flat_amount: null,
        currency: "USD",
        is_active: true,
      },
    ]);

    await handler.handle(makePayload({ city: "Cancún" }));

    // City-specific rule wins → 14%, not 16%
    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({ tax_rate_pct: 14 }),
    );
  });

  it("excludes city-specific rules whose city does not match the payload city", async () => {
    bookingClient.getTaxRules.mockResolvedValue([
      {
        id: "t1",
        country: "Mexico",
        city: null,
        tax_name: "IVA",
        tax_type: "PERCENTAGE",
        rate: "16",
        flat_amount: null,
        currency: "USD",
        is_active: true,
      },
      {
        id: "t2",
        country: "Mexico",
        city: "guadalajara",
        tax_name: "LOCAL",
        tax_type: "PERCENTAGE",
        rate: "3",
        flat_amount: null,
        currency: "USD",
        is_active: true,
      },
    ]);

    // Payload city is Cancún — guadalajara rule should be excluded
    await handler.handle(makePayload({ city: "Cancún" }));

    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({ tax_rate_pct: 16 }),
    );
  });

  it("excludes inactive tax rules", async () => {
    bookingClient.getTaxRules.mockResolvedValue([
      {
        id: "t1",
        country: "Mexico",
        city: null,
        tax_name: "IVA",
        tax_type: "PERCENTAGE",
        rate: "16",
        flat_amount: null,
        currency: "USD",
        is_active: false,
      },
    ]);

    await handler.handle(makePayload());

    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({ tax_rate_pct: 0 }),
    );
  });

  it("excludes non-PERCENTAGE tax rules from rate calculation", async () => {
    bookingClient.getTaxRules.mockResolvedValue([
      {
        id: "t1",
        country: "Mexico",
        city: null,
        tax_name: "FLAT_TAX",
        tax_type: "FLAT",
        rate: null,
        flat_amount: "10",
        currency: "USD",
        is_active: true,
      },
    ]);

    await handler.handle(makePayload());

    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({ tax_rate_pct: 0 }),
    );
  });

  it("treats null rate as 0 in PERCENTAGE tax rules", async () => {
    bookingClient.getTaxRules.mockResolvedValue([
      {
        id: "t1",
        country: "Mexico",
        city: null,
        tax_name: "IVA",
        tax_type: "PERCENTAGE",
        rate: null,
        flat_amount: null,
        currency: "USD",
        is_active: true,
      },
    ]);

    await handler.handle(makePayload());

    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({ tax_rate_pct: 0 }),
    );
  });

  it("treats null flat_amount as 0 in partner fees", async () => {
    bookingClient.getPartnerFees.mockResolvedValue([
      {
        id: "f1",
        partner_id: "p1",
        fee_name: "Resort Fee",
        fee_type: "FLAT_PER_NIGHT",
        rate: null,
        flat_amount: null,
        currency: "USD",
        is_active: true,
      },
      {
        id: "f2",
        partner_id: "p1",
        fee_name: "Cleaning Fee",
        fee_type: "FLAT_PER_STAY",
        rate: null,
        flat_amount: null,
        currency: "USD",
        is_active: true,
      },
    ]);

    await handler.handle(makePayload());

    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        flat_fee_per_night_usd: 0,
        flat_fee_per_stay_usd: 0,
      }),
    );
  });

  it("excludes inactive partner fees", async () => {
    bookingClient.getPartnerFees.mockResolvedValue([
      {
        id: "f1",
        partner_id: "p1",
        fee_name: "Resort Fee",
        fee_type: "FLAT_PER_NIGHT",
        rate: null,
        flat_amount: "30",
        currency: "USD",
        is_active: false,
      },
    ]);

    await handler.handle(makePayload());

    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        flat_fee_per_night_usd: 0,
        flat_fee_per_stay_usd: 0,
      }),
    );
  });

  it("excludes partner fees with non-flat fee types", async () => {
    bookingClient.getPartnerFees.mockResolvedValue([
      {
        id: "f1",
        partner_id: "p1",
        fee_name: "Commission",
        fee_type: "PERCENTAGE",
        rate: "5",
        flat_amount: null,
        currency: "USD",
        is_active: true,
      },
    ]);

    await handler.handle(makePayload());

    expect(repo.upsertRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        flat_fee_per_night_usd: 0,
        flat_fee_per_stay_usd: 0,
      }),
    );
  });
});
