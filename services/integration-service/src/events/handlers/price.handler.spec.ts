import { Test, TestingModule } from "@nestjs/testing";
import { PriceHandler } from "./price.handler";
import { ExternalIdService } from "../../external-id/external-id.service";
import { InventoryClient } from "../../clients/inventory.client";
import { FxService } from "../../fx/fx.service";
import { UnknownEntityError } from "../unknown-entity.error";

const mockExternalIdService = { resolve: jest.fn() };
const mockInventoryClient = { updateRates: jest.fn() };
const mockFxService = { convertToUsd: jest.fn() };

describe("PriceHandler", () => {
  let handler: PriceHandler;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceHandler,
        { provide: ExternalIdService, useValue: mockExternalIdService },
        { provide: InventoryClient, useValue: mockInventoryClient },
        { provide: FxService, useValue: mockFxService },
      ],
    }).compile();
    handler = module.get<PriceHandler>(PriceHandler);
  });

  it("calls FxService when currency is not USD", async () => {
    mockExternalIdService.resolve.mockResolvedValue("internal-room-1");
    mockFxService.convertToUsd.mockResolvedValue(0.00025 * 1000);
    mockInventoryClient.updateRates.mockResolvedValue(undefined);

    await handler.handle("partner-1", {
      externalRoomId: "ext-room-1",
      fromDate: "2026-04-01",
      toDate: "2026-04-02",
      amount: 1000,
      currency: "COP",
    });

    expect(mockFxService.convertToUsd).toHaveBeenCalledWith(1000, "COP");
    expect(mockInventoryClient.updateRates).toHaveBeenCalledWith(
      "internal-room-1",
      expect.objectContaining({
        priceUsd: 0.00025 * 1000,
      }),
    );
  });

  it("does not call FxService when currency is USD", async () => {
    mockExternalIdService.resolve.mockResolvedValue("internal-room-1");
    mockFxService.convertToUsd.mockResolvedValue(200);
    mockInventoryClient.updateRates.mockResolvedValue(undefined);

    await handler.handle("partner-1", {
      externalRoomId: "ext-room-1",
      fromDate: "2026-04-01",
      toDate: "2026-04-02",
      amount: 200,
      currency: "USD",
    });

    // FxService.convertToUsd is called but returns unchanged amount for USD
    expect(mockFxService.convertToUsd).toHaveBeenCalledWith(200, "USD");
  });

  it("throws UnknownEntityError when room mapping not found", async () => {
    mockExternalIdService.resolve.mockResolvedValue(null);

    await expect(
      handler.handle("partner-1", {
        externalRoomId: "missing-room",
        fromDate: "2026-04-01",
        toDate: "2026-04-02",
        amount: 100,
        currency: "USD",
      }),
    ).rejects.toThrow(UnknownEntityError);
  });
});
