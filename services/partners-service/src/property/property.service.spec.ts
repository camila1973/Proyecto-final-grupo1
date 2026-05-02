import { NotFoundException } from "@nestjs/common";
import { PropertyService } from "./property.service.js";
import { BookingClientService } from "../clients/booking-client.service.js";
import { InventoryClientService } from "../clients/inventory-client.service.js";
import type { ReservationDto } from "../partners/dashboard.types.js";

function makeReservation(
  overrides: Partial<ReservationDto> = {},
): ReservationDto {
  return {
    id: "r-default",
    propertyId: "prop-1",
    roomId: "room-1",
    partnerId: "partner-1",
    bookerId: "booker-1",
    status: "confirmed",
    checkIn: "2026-03-01",
    checkOut: "2026-03-04",
    grandTotalUsd: 300,
    guestInfo: {
      firstName: "Carlos",
      lastName: "Garcia",
      email: "carlos@example.com",
      phone: "+50768050496",
    },
    snapshot: {
      propertyName: "Hotel Central Park",
      propertyCity: "Bogotá",
      propertyNeighborhood: null,
      propertyCountryCode: "CO",
      propertyThumbnailUrl: null,
      roomType: "Doble Superior",
    },
    createdAt: "2026-02-15T00:00:00Z",
    ...overrides,
  };
}

function makeBookingClient(
  reservations: ReservationDto[],
): BookingClientService {
  return {
    listReservations: jest.fn().mockResolvedValue(reservations),
  } as unknown as BookingClientService;
}

const INVENTORY_PROP_A = {
  id: "prop-A",
  name: "Hotel Central Park",
  type: "hotel",
  city: "Bogotá",
  countryCode: "CO",
  neighborhood: null,
  stars: 4,
  status: "active",
  partnerId: "partner-1",
  thumbnailUrl: "",
  createdAt: "2026-01-01T00:00:00Z",
};

function makeInventoryClient(
  properties = [INVENTORY_PROP_A],
  propertyById: typeof INVENTORY_PROP_A | null = INVENTORY_PROP_A,
): InventoryClientService {
  return {
    listPropertiesByPartner: jest.fn().mockResolvedValue(properties),
    getPropertyById: jest.fn().mockResolvedValue(propertyById),
  } as unknown as InventoryClientService;
}

function makeSvc(
  bookingClient: BookingClientService,
  inventoryClient: InventoryClientService,
): PropertyService {
  return new PropertyService(bookingClient, inventoryClient);
}

describe("PropertyService", () => {
  describe("getProperties", () => {
    it("returns properties from inventory-service mapped to PropertySummary", async () => {
      const svc = makeSvc(
        makeBookingClient([]),
        makeInventoryClient([INVENTORY_PROP_A]),
      );
      const result = await svc.getProperties("partner-1");

      expect(result.partnerId).toBe("partner-1");
      expect(result.properties).toHaveLength(1);
      const prop = result.properties[0];
      expect(prop.propertyId).toBe("prop-A");
      expect(prop.propertyName).toBe("Hotel Central Park");
      expect(prop.propertyCity).toBe("Bogotá");
    });

    it("returns empty array when no properties exist", async () => {
      const svc = makeSvc(makeBookingClient([]), makeInventoryClient([]));
      const result = await svc.getProperties("partner-1");
      expect(result.properties).toHaveLength(0);
    });
  });

  describe("getPropertyMetrics", () => {
    it("returns metrics and 6-month series scoped to propertyId", async () => {
      const data: ReservationDto[] = [
        makeReservation({ id: "r1", propertyId: "prop-A", grandTotalUsd: 400 }),
        makeReservation({ id: "r2", propertyId: "prop-B", grandTotalUsd: 600 }),
      ];
      const svc = makeSvc(makeBookingClient(data), makeInventoryClient());
      const result = await svc.getPropertyMetrics(
        "partner-1",
        "prop-A",
        "2026-03",
        null,
      );
      expect(result.propertyId).toBe("prop-A");
      expect(result.metrics.revenueUsd).toBe(400);
      expect(result.monthlySeries).toHaveLength(6);
    });

    it("excludes reservations from other properties", async () => {
      const data: ReservationDto[] = [
        makeReservation({ id: "r1", propertyId: "prop-A", grandTotalUsd: 100 }),
        makeReservation({ id: "r2", propertyId: "prop-B", grandTotalUsd: 999 }),
      ];
      const svc = makeSvc(makeBookingClient(data), makeInventoryClient());
      const result = await svc.getPropertyMetrics(
        "partner-1",
        "prop-A",
        "2026-03",
        null,
      );
      expect(result.metrics.revenueUsd).toBe(100);
    });

    it("filters by roomType (case-insensitive)", async () => {
      const data: ReservationDto[] = [
        makeReservation({
          id: "r1",
          propertyId: "prop-A",
          snapshot: { roomType: "Suite" },
        }),
        makeReservation({
          id: "r2",
          propertyId: "prop-A",
          snapshot: { roomType: "Doble Superior" },
        }),
      ];
      const svc = makeSvc(makeBookingClient(data), makeInventoryClient());
      const result = await svc.getPropertyMetrics(
        "partner-1",
        "prop-A",
        "2026-03",
        "suite",
      );
      expect(result.metrics.confirmed).toBe(1);
    });
  });

  describe("getPropertyReservations", () => {
    it("returns only reservations for the specified property and month", async () => {
      const data: ReservationDto[] = [
        makeReservation({ id: "r1", propertyId: "prop-A" }),
        makeReservation({ id: "r2", propertyId: "prop-B" }),
      ];
      const svc = makeSvc(makeBookingClient(data), makeInventoryClient());
      const result = await svc.getPropertyReservations(
        "partner-1",
        "prop-A",
        "2026-03",
        null,
      );
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].id).toBe("r1");
    });

    it("renders dash placeholders when guest info is missing", async () => {
      const data: ReservationDto[] = [
        makeReservation({ propertyId: "prop-A", guestInfo: null }),
      ];
      const svc = makeSvc(makeBookingClient(data), makeInventoryClient());
      const result = await svc.getPropertyReservations(
        "partner-1",
        "prop-A",
        "2026-03",
        null,
      );
      expect(result.reservations[0].guestName).toBe("—");
      expect(result.reservations[0].guestEmail).toBe("—");
    });
  });

  describe("getPropertySummary", () => {
    it("returns a PropertySummary mapped from inventory-service", async () => {
      const svc = makeSvc(makeBookingClient([]), makeInventoryClient());
      const result = await svc.getPropertySummary("partner-1", "prop-A");
      expect(result).toEqual({
        propertyId: "prop-A",
        propertyName: "Hotel Central Park",
        propertyCity: "Bogotá",
        propertyNeighborhood: null,
        propertyCountryCode: "CO",
        propertyThumbnailUrl: null,
        createdAt: "2026-01-01T00:00:00Z",
        roomCount: 0,
        reservationCount: 0,
      });
    });

    it("throws NotFoundException when inventory-service returns null", async () => {
      const svc = makeSvc(makeBookingClient([]), makeInventoryClient([], null));
      await expect(
        svc.getPropertySummary("partner-1", "prop-X"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
