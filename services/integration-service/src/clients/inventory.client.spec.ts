import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { InventoryClient } from "./inventory.client";
import { UpstreamServiceError } from "./upstream-service.error";

const mockHttpService = {
  post: jest.fn(),
  patch: jest.fn(),
};

describe("InventoryClient", () => {
  let client: InventoryClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryClient,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();
    client = module.get<InventoryClient>(InventoryClient);
  });

  describe("createProperty", () => {
    it("returns the created property id on success", async () => {
      mockHttpService.post.mockReturnValue(of({ data: { id: "prop-1" } }));

      const result = await client.createProperty({
        name: "Hotel Test",
        type: "hotel",
        city: "Miami",
        countryCode: "US",
        partnerId: "partner-1",
      });

      expect(result).toEqual({ id: "prop-1" });
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/properties"),
        expect.any(Object),
      );
    });

    it("throws UpstreamServiceError on HTTP failure", async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error("network")),
      );

      await expect(
        client.createProperty({
          name: "Hotel",
          type: "hotel",
          city: "City",
          countryCode: "US",
          partnerId: "p1",
        }),
      ).rejects.toThrow(UpstreamServiceError);
    });
  });

  describe("updateProperty", () => {
    it("calls PATCH on success", async () => {
      mockHttpService.patch.mockReturnValue(of({ data: {} }));

      await client.updateProperty("prop-1", { name: "Updated Hotel" });

      expect(mockHttpService.patch).toHaveBeenCalledWith(
        expect.stringContaining("/properties/prop-1"),
        { name: "Updated Hotel" },
      );
    });

    it("throws UpstreamServiceError on HTTP failure", async () => {
      mockHttpService.patch.mockReturnValue(
        throwError(() => new Error("network")),
      );

      await expect(
        client.updateProperty("prop-1", { name: "Updated" }),
      ).rejects.toThrow(UpstreamServiceError);
    });
  });

  describe("createRoom", () => {
    it("returns the created room id on success", async () => {
      mockHttpService.post.mockReturnValue(of({ data: { id: "room-1" } }));

      const result = await client.createRoom("prop-1", {
        roomType: "Standard",
        capacity: 2,
        totalRooms: 10,
        basePriceUsd: 100,
      });

      expect(result).toEqual({ id: "room-1" });
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/rooms"),
        expect.objectContaining({ propertyId: "prop-1" }),
      );
    });

    it("throws UpstreamServiceError on HTTP failure", async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error("network")),
      );

      await expect(
        client.createRoom("prop-1", {
          roomType: "Standard",
          capacity: 2,
          totalRooms: 5,
          basePriceUsd: 100,
        }),
      ).rejects.toThrow(UpstreamServiceError);
    });
  });

  describe("updateRoom", () => {
    it("calls PATCH on success", async () => {
      mockHttpService.patch.mockReturnValue(of({ data: {} }));

      await client.updateRoom("room-1", { roomType: "Deluxe" });

      expect(mockHttpService.patch).toHaveBeenCalledWith(
        expect.stringContaining("/rooms/room-1"),
        { roomType: "Deluxe" },
      );
    });

    it("throws UpstreamServiceError on HTTP failure", async () => {
      mockHttpService.patch.mockReturnValue(
        throwError(() => new Error("network")),
      );

      await expect(
        client.updateRoom("room-1", { roomType: "Deluxe" }),
      ).rejects.toThrow(UpstreamServiceError);
    });
  });

  describe("updateAvailability", () => {
    it("calls unblock endpoint when available=true", async () => {
      mockHttpService.post.mockReturnValue(of({ data: {} }));

      await client.updateAvailability("room-1", {
        date: "2026-04-01",
        available: true,
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/availability/unblock"),
        expect.objectContaining({ roomId: "room-1" }),
      );
    });

    it("calls block endpoint when available=false", async () => {
      mockHttpService.post.mockReturnValue(of({ data: {} }));

      await client.updateAvailability("room-1", {
        date: "2026-04-01",
        available: false,
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/availability/block"),
        expect.objectContaining({ roomId: "room-1" }),
      );
    });

    it("throws UpstreamServiceError on HTTP failure", async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error("network")),
      );

      await expect(
        client.updateAvailability("room-1", {
          date: "2026-04-01",
          available: true,
        }),
      ).rejects.toThrow(UpstreamServiceError);
    });
  });

  describe("updateRates", () => {
    it("calls POST on success", async () => {
      mockHttpService.post.mockReturnValue(of({ data: {} }));

      await client.updateRates("room-1", {
        fromDate: "2026-04-01",
        toDate: "2026-04-02",
        priceUsd: 150,
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/rooms/room-1/rates"),
        expect.any(Object),
      );
    });

    it("throws UpstreamServiceError on HTTP failure", async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error("network")),
      );

      await expect(
        client.updateRates("room-1", {
          fromDate: "2026-04-01",
          toDate: "2026-04-02",
          priceUsd: 150,
        }),
      ).rejects.toThrow(UpstreamServiceError);
    });
  });
});
