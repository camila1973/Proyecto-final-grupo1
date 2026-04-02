import { RoomDeletedHandler } from "./room-deleted.handler.js";
import type { PropertiesRepository } from "../../properties/properties.repository.js";
import type { PropertiesService } from "../../properties/properties.service.js";
import type { RoomDeletedPayload } from "./room-deleted.handler.js";

const makePayload = (
  overrides: Partial<RoomDeletedPayload> = {},
): RoomDeletedPayload => ({
  routingKey: "inventory.room.deleted",
  roomId: "550e8400-e29b-41d4-a716-446655440000",
  propertyId: "660e8400-e29b-41d4-a716-446655440001",
  timestamp: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("RoomDeletedHandler", () => {
  let handler: RoomDeletedHandler;
  let repo: jest.Mocked<
    Pick<PropertiesRepository, "findRoomCity" | "deactivateRoom">
  >;
  let propertiesService: jest.Mocked<
    Pick<PropertiesService, "invalidateCityCache">
  >;

  beforeEach(() => {
    repo = {
      findRoomCity: jest.fn().mockResolvedValue("Cancún"),
      deactivateRoom: jest.fn().mockResolvedValue(undefined),
    };
    propertiesService = {
      invalidateCityCache: jest.fn().mockResolvedValue(undefined),
    };

    handler = new RoomDeletedHandler(
      repo as unknown as PropertiesRepository,
      propertiesService as unknown as PropertiesService,
    );
  });

  it("deactivates the room and invalidates city cache when city is found", async () => {
    const payload = makePayload();
    await handler.handle(payload);

    expect(repo.findRoomCity).toHaveBeenCalledWith(payload.roomId);
    expect(repo.deactivateRoom).toHaveBeenCalledWith(payload.roomId);
    expect(propertiesService.invalidateCityCache).toHaveBeenCalledWith(
      "Cancún",
    );
  });

  it("deactivates the room but does not invalidate cache when room is not in index", async () => {
    repo.findRoomCity.mockResolvedValue(undefined);
    const payload = makePayload();
    await handler.handle(payload);

    expect(repo.deactivateRoom).toHaveBeenCalledWith(payload.roomId);
    expect(propertiesService.invalidateCityCache).not.toHaveBeenCalled();
  });
});
