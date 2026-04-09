import { Test, TestingModule } from "@nestjs/testing";
import { BookingHandler } from "./booking.handler";
import { ExternalIdService } from "../../external-id/external-id.service";
import { BookingClient } from "../../clients/booking.client";
import { UnknownEntityError } from "../unknown-entity.error";

const mockExternalIdService = {
  resolve: jest.fn(),
  register: jest.fn(),
};
const mockBookingClient = {
  createBooking: jest.fn(),
};

function makeValidBookingData(overrides: Record<string, unknown> = {}) {
  return {
    externalId: "ext-booking-1",
    externalPropertyId: "ext-prop-1",
    externalRoomId: "ext-room-1",
    guestName: "John Doe",
    checkIn: "2026-04-01",
    checkOut: "2026-04-03",
    totalPriceUsd: 300,
    ...overrides,
  };
}

describe("BookingHandler", () => {
  let handler: BookingHandler;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingHandler,
        { provide: ExternalIdService, useValue: mockExternalIdService },
        { provide: BookingClient, useValue: mockBookingClient },
      ],
    }).compile();
    handler = module.get<BookingHandler>(BookingHandler);
  });

  it("creates booking when no existing mapping and all entities known", async () => {
    mockExternalIdService.resolve
      .mockResolvedValueOnce(null) // booking not yet mapped
      .mockResolvedValueOnce("internal-prop-1") // property mapped
      .mockResolvedValueOnce("internal-room-1"); // room mapped
    mockBookingClient.createBooking.mockResolvedValue({
      id: "internal-booking-1",
    });
    mockExternalIdService.register.mockResolvedValue(undefined);

    await handler.handle("partner-1", makeValidBookingData());

    expect(mockBookingClient.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: "internal-prop-1",
        roomId: "internal-room-1",
        guestName: "John Doe",
        checkIn: "2026-04-01",
        checkOut: "2026-04-03",
        totalPriceUsd: 300,
        externalBookingId: "ext-booking-1",
      }),
    );
    expect(mockExternalIdService.register).toHaveBeenCalledWith(
      "partner-1",
      "booking",
      "ext-booking-1",
      "internal-booking-1",
    );
  });

  it("returns early (idempotent) when booking already mapped", async () => {
    mockExternalIdService.resolve.mockResolvedValueOnce("existing-booking-id");

    await handler.handle("partner-1", makeValidBookingData());

    expect(mockBookingClient.createBooking).not.toHaveBeenCalled();
  });

  it("throws UnknownEntityError when property mapping not found", async () => {
    mockExternalIdService.resolve
      .mockResolvedValueOnce(null) // booking not mapped
      .mockResolvedValueOnce(null); // property not mapped

    await expect(
      handler.handle("partner-1", makeValidBookingData()),
    ).rejects.toThrow(UnknownEntityError);
  });

  it("throws UnknownEntityError when room mapping not found", async () => {
    mockExternalIdService.resolve
      .mockResolvedValueOnce(null) // booking not mapped
      .mockResolvedValueOnce("internal-prop-1") // property mapped
      .mockResolvedValueOnce(null); // room not mapped

    await expect(
      handler.handle("partner-1", makeValidBookingData()),
    ).rejects.toThrow(UnknownEntityError);
  });

  it("throws validation error when required field is missing", async () => {
    const invalidData = { externalId: "ext-booking-1" }; // missing required fields

    await expect(
      handler.handle("partner-1", invalidData),
    ).rejects.toBeDefined();
  });
});
