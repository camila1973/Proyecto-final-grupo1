import { AvailabilityUpdatedHandler } from "./availability-updated.handler.js";
import type { PropertiesRepository } from "../../properties/properties.repository.js";
import type { PricePeriodsRepository } from "../../properties/price-periods.repository.js";
import type { PropertiesService } from "../../properties/properties.service.js";

describe("AvailabilityUpdatedHandler", () => {
  let handler: AvailabilityUpdatedHandler;
  let propertiesRepo: jest.Mocked<Pick<PropertiesRepository, "findRoomCity">>;
  let pricePeriodsRepo: jest.Mocked<
    Pick<PricePeriodsRepository, "replaceForRoom">
  >;
  let propertiesService: jest.Mocked<
    Pick<PropertiesService, "invalidateCityCache">
  >;

  beforeEach(() => {
    propertiesRepo = {
      findRoomCity: jest.fn().mockResolvedValue("Cancún"),
    };
    pricePeriodsRepo = {
      replaceForRoom: jest.fn().mockResolvedValue(undefined),
    };
    propertiesService = {
      invalidateCityCache: jest.fn().mockResolvedValue(undefined),
    };

    handler = new AvailabilityUpdatedHandler(
      propertiesRepo as unknown as PropertiesRepository,
      pricePeriodsRepo as unknown as PricePeriodsRepository,
      propertiesService as unknown as PropertiesService,
    );
  });

  it("replaces price periods and invalidates city cache", async () => {
    const payload = {
      roomId: "550e8400-e29b-41d4-a716-446655440000",
      pricePeriods: [
        { fromDate: "2026-04-01", toDate: "2026-06-30", priceUsd: 200 },
        { fromDate: "2026-07-01", toDate: "2026-08-31", priceUsd: 240 },
      ],
    };

    await handler.handle(payload);

    expect(pricePeriodsRepo.replaceForRoom).toHaveBeenCalledWith(
      payload.roomId,
      [
        { from_date: "2026-04-01", to_date: "2026-06-30", price_usd: 200 },
        { from_date: "2026-07-01", to_date: "2026-08-31", price_usd: 240 },
      ],
    );
    expect(propertiesService.invalidateCityCache).toHaveBeenCalledWith(
      "Cancún",
    );
  });

  it("handles empty pricePeriods array", async () => {
    await handler.handle({
      roomId: "550e8400-e29b-41d4-a716-446655440000",
      pricePeriods: [],
    });

    expect(pricePeriodsRepo.replaceForRoom).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440000",
      [],
    );
  });

  it("does not call invalidateCityCache when room is not found in index", async () => {
    propertiesRepo.findRoomCity.mockResolvedValue(undefined);

    await handler.handle({
      roomId: "550e8400-e29b-41d4-a716-446655440000",
      pricePeriods: [],
    });

    expect(propertiesService.invalidateCityCache).not.toHaveBeenCalled();
  });
});
