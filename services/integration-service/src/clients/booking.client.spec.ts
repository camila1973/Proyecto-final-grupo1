import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { BookingClient } from "./booking.client";
import { UpstreamServiceError } from "./upstream-service.error";

const mockHttpService = {
  post: jest.fn(),
  delete: jest.fn(),
};

describe("BookingClient", () => {
  let client: BookingClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingClient,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();
    client = module.get<BookingClient>(BookingClient);
  });

  describe("createBooking", () => {
    it("returns the created booking id on success", async () => {
      mockHttpService.post.mockReturnValue(of({ data: { id: "booking-1" } }));

      const result = await client.createBooking({
        propertyId: "prop-1",
        roomId: "room-1",
        partnerId: "partner-1",
        guestName: "John Doe",
        checkIn: "2026-04-01",
        checkOut: "2026-04-03",
        totalPriceUsd: 300,
      });

      expect(result).toEqual({ id: "booking-1" });
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/bookings"),
        expect.any(Object),
      );
    });

    it("throws UpstreamServiceError on HTTP failure", async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error("network")),
      );

      await expect(
        client.createBooking({
          propertyId: "prop-1",
          roomId: "room-1",
          partnerId: "p1",
          guestName: "John",
          checkIn: "2026-04-01",
          checkOut: "2026-04-03",
          totalPriceUsd: 100,
        }),
      ).rejects.toThrow(UpstreamServiceError);
    });
  });

  describe("createHold", () => {
    it("returns the created hold id on success", async () => {
      mockHttpService.post.mockReturnValue(of({ data: { id: "hold-1" } }));

      const result = await client.createHold({
        roomId: "room-1",
        partnerId: "partner-1",
        checkIn: "2026-04-01",
        checkOut: "2026-04-03",
      });

      expect(result).toEqual({ id: "hold-1" });
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/holds"),
        expect.any(Object),
      );
    });

    it("throws UpstreamServiceError on HTTP failure", async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error("network")),
      );

      await expect(
        client.createHold({
          roomId: "room-1",
          partnerId: "p1",
          checkIn: "2026-04-01",
          checkOut: "2026-04-03",
        }),
      ).rejects.toThrow(UpstreamServiceError);
    });
  });

  describe("releaseHold", () => {
    it("calls DELETE on success", async () => {
      mockHttpService.delete.mockReturnValue(of({ data: {} }));

      await client.releaseHold("hold-1");

      expect(mockHttpService.delete).toHaveBeenCalledWith(
        expect.stringContaining("/holds/hold-1"),
      );
    });

    it("throws UpstreamServiceError on HTTP failure", async () => {
      mockHttpService.delete.mockReturnValue(
        throwError(() => new Error("network")),
      );

      await expect(client.releaseHold("hold-1")).rejects.toThrow(
        UpstreamServiceError,
      );
    });
  });
});
