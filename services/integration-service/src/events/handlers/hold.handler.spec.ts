import { Test, TestingModule } from "@nestjs/testing";
import { HoldHandler } from "./hold.handler";
import { ExternalIdService } from "../../external-id/external-id.service";
import { BookingClient } from "../../clients/booking.client";
import { UnknownEntityError } from "../unknown-entity.error";

const mockExternalIdService = {
  resolve: jest.fn(),
  register: jest.fn(),
};
const mockBookingClient = {
  createHold: jest.fn(),
  releaseHold: jest.fn(),
};

function makeValidHoldData(overrides: Record<string, unknown> = {}) {
  return {
    externalId: "ext-hold-1",
    externalRoomId: "ext-room-1",
    checkIn: "2026-04-01",
    checkOut: "2026-04-03",
    ...overrides,
  };
}

describe("HoldHandler", () => {
  let handler: HoldHandler;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HoldHandler,
        { provide: ExternalIdService, useValue: mockExternalIdService },
        { provide: BookingClient, useValue: mockBookingClient },
      ],
    }).compile();
    handler = module.get<HoldHandler>(HoldHandler);
  });

  describe("hold.created", () => {
    it("creates hold when no existing mapping and room is known", async () => {
      mockExternalIdService.resolve
        .mockResolvedValueOnce(null) // hold not yet mapped
        .mockResolvedValueOnce("internal-room-1"); // room mapped
      mockBookingClient.createHold.mockResolvedValue({ id: "internal-hold-1" });
      mockExternalIdService.register.mockResolvedValue(undefined);

      await handler.handle("partner-1", "hold.created", makeValidHoldData());

      expect(mockBookingClient.createHold).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: "internal-room-1",
          partnerId: "partner-1",
          checkIn: "2026-04-01",
          checkOut: "2026-04-03",
          externalHoldId: "ext-hold-1",
        }),
      );
      expect(mockExternalIdService.register).toHaveBeenCalledWith(
        "partner-1",
        "hold",
        "ext-hold-1",
        "internal-hold-1",
      );
    });

    it("returns early (idempotent) when hold already mapped", async () => {
      mockExternalIdService.resolve.mockResolvedValueOnce("existing-hold-id");

      await handler.handle("partner-1", "hold.created", makeValidHoldData());

      expect(mockBookingClient.createHold).not.toHaveBeenCalled();
    });

    it("throws UnknownEntityError when room mapping not found", async () => {
      mockExternalIdService.resolve
        .mockResolvedValueOnce(null) // hold not mapped
        .mockResolvedValueOnce(null); // room not mapped

      await expect(
        handler.handle("partner-1", "hold.created", makeValidHoldData()),
      ).rejects.toThrow(UnknownEntityError);
    });
  });

  describe("hold.released", () => {
    it("releases hold when hold mapping is known", async () => {
      mockExternalIdService.resolve.mockResolvedValue("internal-hold-1");
      mockBookingClient.releaseHold.mockResolvedValue(undefined);

      await handler.handle("partner-1", "hold.released", makeValidHoldData());

      expect(mockBookingClient.releaseHold).toHaveBeenCalledWith(
        "internal-hold-1",
      );
    });

    it("throws UnknownEntityError when hold mapping not found", async () => {
      mockExternalIdService.resolve.mockResolvedValue(null);

      await expect(
        handler.handle("partner-1", "hold.released", makeValidHoldData()),
      ).rejects.toThrow(UnknownEntityError);
    });
  });

  it("throws validation error when required field is missing", async () => {
    const invalidData = { externalId: "ext-hold-1" }; // missing externalRoomId, checkIn, checkOut

    await expect(
      handler.handle("partner-1", "hold.created", invalidData),
    ).rejects.toBeDefined();
  });
});
