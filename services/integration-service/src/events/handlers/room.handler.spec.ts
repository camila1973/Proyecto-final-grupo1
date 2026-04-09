import { Test, TestingModule } from "@nestjs/testing";
import { RoomHandler } from "./room.handler";
import { ExternalIdService } from "../../external-id/external-id.service";
import { InventoryClient } from "../../clients/inventory.client";
import { UnknownEntityError } from "../unknown-entity.error";

const mockExternalIdService = {
  resolve: jest.fn(),
  register: jest.fn(),
};
const mockInventoryClient = {
  createRoom: jest.fn(),
  updateRoom: jest.fn(),
};

function makeValidRoomData(overrides: Record<string, unknown> = {}) {
  return {
    externalId: "ext-room-1",
    externalPropertyId: "ext-prop-1",
    roomType: "Standard",
    capacity: 2,
    totalRooms: 10,
    basePriceUsd: 100,
    ...overrides,
  };
}

describe("RoomHandler", () => {
  let handler: RoomHandler;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomHandler,
        { provide: ExternalIdService, useValue: mockExternalIdService },
        { provide: InventoryClient, useValue: mockInventoryClient },
      ],
    }).compile();
    handler = module.get<RoomHandler>(RoomHandler);
  });

  describe("room.created", () => {
    it("creates room when internalId is unknown and propertyId is known", async () => {
      mockExternalIdService.resolve
        .mockResolvedValueOnce(null) // room not yet mapped
        .mockResolvedValueOnce("internal-prop-1"); // property mapped
      mockInventoryClient.createRoom.mockResolvedValue({
        id: "internal-room-1",
      });
      mockExternalIdService.register.mockResolvedValue(undefined);

      await handler.handle("partner-1", "room.created", makeValidRoomData());

      expect(mockInventoryClient.createRoom).toHaveBeenCalledWith(
        "internal-prop-1",
        expect.objectContaining({ roomType: "Standard", capacity: 2 }),
      );
      expect(mockExternalIdService.register).toHaveBeenCalledWith(
        "partner-1",
        "room",
        "ext-room-1",
        "internal-room-1",
      );
    });

    it("returns early (idempotent) when room already mapped", async () => {
      mockExternalIdService.resolve.mockResolvedValueOnce("existing-room-id");

      await handler.handle("partner-1", "room.created", makeValidRoomData());

      expect(mockInventoryClient.createRoom).not.toHaveBeenCalled();
    });

    it("throws UnknownEntityError when property mapping is missing", async () => {
      mockExternalIdService.resolve
        .mockResolvedValueOnce(null) // room not mapped
        .mockResolvedValueOnce(null); // property not mapped

      await expect(
        handler.handle("partner-1", "room.created", makeValidRoomData()),
      ).rejects.toThrow(UnknownEntityError);
    });
  });

  describe("room.updated", () => {
    it("updates room when internalId is known", async () => {
      mockExternalIdService.resolve.mockResolvedValue("internal-room-1");
      mockInventoryClient.updateRoom.mockResolvedValue(undefined);

      await handler.handle("partner-1", "room.updated", makeValidRoomData());

      expect(mockInventoryClient.updateRoom).toHaveBeenCalledWith(
        "internal-room-1",
        expect.objectContaining({ roomType: "Standard" }),
      );
    });

    it("throws UnknownEntityError when room mapping is missing", async () => {
      mockExternalIdService.resolve.mockResolvedValue(null);

      await expect(
        handler.handle("partner-1", "room.updated", makeValidRoomData()),
      ).rejects.toThrow(UnknownEntityError);
    });
  });

  it("throws validation error when required field is missing", async () => {
    const invalidData = { externalId: "ext-room-1" }; // missing required fields

    await expect(
      handler.handle("partner-1", "room.created", invalidData),
    ).rejects.toBeDefined();
  });
});
