import { Test, TestingModule } from "@nestjs/testing";
import { AvailabilityHandler } from "./availability.handler";
import { ExternalIdService } from "../../external-id/external-id.service";
import { InventoryClient } from "../../clients/inventory.client";
import { UnknownEntityError } from "../unknown-entity.error";

const mockExternalIdService = { resolve: jest.fn() };
const mockInventoryClient = { updateAvailability: jest.fn() };

describe("AvailabilityHandler", () => {
  let handler: AvailabilityHandler;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityHandler,
        { provide: ExternalIdService, useValue: mockExternalIdService },
        { provide: InventoryClient, useValue: mockInventoryClient },
      ],
    }).compile();
    handler = module.get<AvailabilityHandler>(AvailabilityHandler);
  });

  it("calls inventoryClient.updateAvailability when room is known", async () => {
    mockExternalIdService.resolve.mockResolvedValue("internal-room-1");
    mockInventoryClient.updateAvailability.mockResolvedValue(undefined);

    await handler.handle("partner-1", {
      externalRoomId: "ext-room-1",
      date: "2026-04-01",
      available: true,
    });

    expect(mockInventoryClient.updateAvailability).toHaveBeenCalledWith(
      "internal-room-1",
      { date: "2026-04-01", available: true },
    );
  });

  it("throws UnknownEntityError when room mapping not found", async () => {
    mockExternalIdService.resolve.mockResolvedValue(null);

    await expect(
      handler.handle("partner-1", {
        externalRoomId: "unknown-room",
        date: "2026-04-01",
        available: false,
      }),
    ).rejects.toThrow(UnknownEntityError);
  });

  it("throws validation error when required field is missing", async () => {
    await expect(
      handler.handle("partner-1", { externalRoomId: "ext-room-1" }),
    ).rejects.toBeDefined();
  });
});
