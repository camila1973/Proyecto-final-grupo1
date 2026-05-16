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

    it("filters by status when provided", async () => {
      const data: ReservationDto[] = [
        makeReservation({
          id: "r1",
          propertyId: "prop-A",
          status: "confirmed",
        }),
        makeReservation({
          id: "r2",
          propertyId: "prop-A",
          status: "checked_in",
        }),
        makeReservation({
          id: "r3",
          propertyId: "prop-A",
          status: "cancelled",
        }),
      ];
      const svc = makeSvc(makeBookingClient(data), makeInventoryClient());
      const result = await svc.getPropertyReservations(
        "partner-1",
        "prop-A",
        "2026-03",
        null,
        "confirmed",
        null,
        null,
      );
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].id).toBe("r1");
    });

    it("filters by reservationId (partial, case-insensitive) when provided", async () => {
      const data: ReservationDto[] = [
        makeReservation({ id: "ABC123", propertyId: "prop-A" }),
        makeReservation({ id: "XYZ999", propertyId: "prop-A" }),
      ];
      const svc = makeSvc(makeBookingClient(data), makeInventoryClient());
      const result = await svc.getPropertyReservations(
        "partner-1",
        "prop-A",
        "2026-03",
        null,
        null,
        "abc",
        null,
      );
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].id).toBe("ABC123");
    });

    it("filters by guestName (partial, case-insensitive) when provided", async () => {
      const data: ReservationDto[] = [
        makeReservation({
          id: "r1",
          propertyId: "prop-A",
          guestInfo: {
            firstName: "Carlos",
            lastName: "Garcia",
            email: "c@e.com",
          },
        }),
        makeReservation({
          id: "r2",
          propertyId: "prop-A",
          guestInfo: { firstName: "Ana", lastName: "López", email: "a@e.com" },
        }),
      ];
      const svc = makeSvc(makeBookingClient(data), makeInventoryClient());
      const result = await svc.getPropertyReservations(
        "partner-1",
        "prop-A",
        "2026-03",
        null,
        null,
        null,
        "carlos",
      );
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].id).toBe("r1");
    });

    it("returns all reservations when all filters are null", async () => {
      const data: ReservationDto[] = [
        makeReservation({
          id: "r1",
          propertyId: "prop-A",
          status: "confirmed",
        }),
        makeReservation({
          id: "r2",
          propertyId: "prop-A",
          status: "checked_in",
        }),
      ];
      const svc = makeSvc(makeBookingClient(data), makeInventoryClient());
      const result = await svc.getPropertyReservations(
        "partner-1",
        "prop-A",
        "2026-03",
        null,
        null,
        null,
        null,
      );
      expect(result.reservations).toHaveLength(2);
    });

    it("includes filter values in the response envelope", async () => {
      const svc = makeSvc(makeBookingClient([]), makeInventoryClient());
      const result = await svc.getPropertyReservations(
        "partner-1",
        "prop-A",
        "2026-03",
        null,
        "confirmed",
        "ABC",
        "carlos",
      );
      expect(result.status).toBe("confirmed");
      expect(result.reservationId).toBe("ABC");
      expect(result.guestName).toBe("carlos");
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

  describe("deleteRoomRate", () => {
    it("delegates to the inventory client when the rate exists", async () => {
      const deleteRoomRate = jest.fn().mockResolvedValue(true);
      const inventoryClient = {
        deleteRoomRate,
      } as unknown as InventoryClientService;
      const svc = makeSvc(makeBookingClient([]), inventoryClient);

      await expect(svc.deleteRoomRate("rate-1")).resolves.toBeUndefined();
      expect(deleteRoomRate).toHaveBeenCalledWith("rate-1");
    });

    it("throws NotFoundException when the inventory client reports the rate is missing", async () => {
      const deleteRoomRate = jest.fn().mockResolvedValue(false);
      const inventoryClient = {
        deleteRoomRate,
      } as unknown as InventoryClientService;
      const svc = makeSvc(makeBookingClient([]), inventoryClient);

      await expect(svc.deleteRoomRate("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateRoomRate", () => {
    it("delegates to the inventory client when the rate exists", async () => {
      const updated = {
        id: "rate-1",
        roomId: "room-1",
        fromDate: "2026-05-01",
        toDate: "2026-05-31",
        priceUsd: "200",
        currency: "USD",
        createdAt: "2026-05-01",
      };
      const updateRoomRate = jest.fn().mockResolvedValue(updated);
      const inventoryClient = {
        updateRoomRate,
      } as unknown as InventoryClientService;
      const svc = makeSvc(makeBookingClient([]), inventoryClient);

      await expect(
        svc.updateRoomRate("rate-1", "2026-05-01", "2026-05-31", 200),
      ).resolves.toBeUndefined();
      expect(updateRoomRate).toHaveBeenCalledWith(
        "rate-1",
        "2026-05-01",
        "2026-05-31",
        200,
      );
    });

    it("throws NotFoundException when the inventory client returns null", async () => {
      const updateRoomRate = jest.fn().mockResolvedValue(null);
      const inventoryClient = {
        updateRoomRate,
      } as unknown as InventoryClientService;
      const svc = makeSvc(makeBookingClient([]), inventoryClient);

      await expect(
        svc.updateRoomRate("missing", "2026-05-01", "2026-05-31", 200),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getRoomDetail", () => {
    it("maps an inventory room to RoomDetail", async () => {
      const room = {
        id: "room-1",
        propertyId: "prop-1",
        roomType: "deluxe",
        bedType: "king",
        viewType: "ocean",
        capacity: 2,
        totalRooms: 5,
        basePriceUsd: "150.5",
        status: "active",
      };
      const inv = {
        getRoomById: jest.fn().mockResolvedValue(room),
      } as unknown as InventoryClientService;
      const svc = makeSvc(makeBookingClient([]), inv);
      const result = await svc.getRoomDetail("room-1");
      expect(result).toEqual({
        id: "room-1",
        propertyId: "prop-1",
        roomType: "deluxe",
        bedType: "king",
        viewType: "ocean",
        capacity: 2,
        totalRooms: 5,
        basePriceUsd: 150.5,
        status: "active",
      });
    });

    it("returns null when the inventory client returns null", async () => {
      const inv = {
        getRoomById: jest.fn().mockResolvedValue(null),
      } as unknown as InventoryClientService;
      const svc = makeSvc(makeBookingClient([]), inv);
      expect(await svc.getRoomDetail("missing")).toBeNull();
    });
  });

  describe("getRoomAvailability", () => {
    it("delegates to the inventory client", async () => {
      const days = [
        {
          date: "2026-05-01",
          totalRooms: 5,
          reservedRooms: 1,
          heldRooms: 0,
          blocked: false,
          available: true,
        },
      ];
      const getRoomAvailability = jest.fn().mockResolvedValue(days);
      const inv = {
        getRoomAvailability,
      } as unknown as InventoryClientService;
      const svc = makeSvc(makeBookingClient([]), inv);
      const result = await svc.getRoomAvailability(
        "room-1",
        "2026-05-01",
        "2026-05-31",
      );
      expect(result).toEqual(days);
      expect(getRoomAvailability).toHaveBeenCalledWith(
        "room-1",
        "2026-05-01",
        "2026-05-31",
      );
    });
  });

  describe("getRoomRates", () => {
    it("maps inventory rates to RoomRatePeriod", async () => {
      const periods = [
        {
          id: "rate-1",
          roomId: "room-1",
          fromDate: "2026-05-01",
          toDate: "2026-05-31",
          priceUsd: "120.0",
          currency: "USD",
          createdAt: "2026-01-01",
        },
      ];
      const inv = {
        getRoomRates: jest.fn().mockResolvedValue(periods),
      } as unknown as InventoryClientService;
      const svc = makeSvc(makeBookingClient([]), inv);
      const result = await svc.getRoomRates(
        "room-1",
        "prop-1",
        "2026-05-01",
        "2026-05-31",
      );
      expect(result).toEqual([
        {
          id: "rate-1",
          roomId: "room-1",
          fromDate: "2026-05-01",
          toDate: "2026-05-31",
          priceUsd: 120,
          currency: "USD",
          createdAt: "2026-01-01",
        },
      ]);
    });
  });

  describe("blockRoomDates / unblockRoomDates", () => {
    it("delegates blockRoomDates to the inventory client", async () => {
      const blockRoomDates = jest.fn().mockResolvedValue(undefined);
      const inv = {
        blockRoomDates,
      } as unknown as InventoryClientService;
      const svc = makeSvc(makeBookingClient([]), inv);
      await svc.blockRoomDates("room-1", "2026-05-01", "2026-05-05");
      expect(blockRoomDates).toHaveBeenCalledWith(
        "room-1",
        "2026-05-01",
        "2026-05-05",
      );
    });

    it("delegates unblockRoomDates to the inventory client", async () => {
      const unblockRoomDates = jest.fn().mockResolvedValue(undefined);
      const inv = {
        unblockRoomDates,
      } as unknown as InventoryClientService;
      const svc = makeSvc(makeBookingClient([]), inv);
      await svc.unblockRoomDates("room-1", "2026-05-01", "2026-05-05");
      expect(unblockRoomDates).toHaveBeenCalledWith(
        "room-1",
        "2026-05-01",
        "2026-05-05",
      );
    });
  });

  describe("createRoomRate", () => {
    it("delegates to the inventory client", async () => {
      const createRoomRate = jest.fn().mockResolvedValue({
        id: "rate-1",
        roomId: "room-1",
        fromDate: "2026-05-01",
        toDate: "2026-05-31",
        priceUsd: "150",
        currency: "USD",
        createdAt: "2026-05-01",
      });
      const inv = {
        createRoomRate,
      } as unknown as InventoryClientService;
      const svc = makeSvc(makeBookingClient([]), inv);
      await svc.createRoomRate("room-1", "2026-05-01", "2026-05-31", 150);
      expect(createRoomRate).toHaveBeenCalledWith(
        "room-1",
        "2026-05-01",
        "2026-05-31",
        150,
      );
    });
  });

  describe("getPropertyRooms", () => {
    it("returns rows with computed occupancy rate", async () => {
      const room = {
        id: "room-1",
        propertyId: "prop-A",
        roomType: "deluxe",
        bedType: "king",
        viewType: "ocean",
        capacity: 2,
        totalRooms: 1,
        basePriceUsd: "100",
        status: "active",
      };
      const reservations: ReservationDto[] = [
        makeReservation({
          id: "r1",
          propertyId: "prop-A",
          roomId: "room-1",
          status: "confirmed",
          checkIn: "2026-03-01",
          checkOut: "2026-03-04",
        }),
      ];
      const inv = {
        listRoomsByProperty: jest.fn().mockResolvedValue([room]),
      } as unknown as InventoryClientService;
      const svc = makeSvc(makeBookingClient(reservations), inv);
      const result = await svc.getPropertyRooms(
        "partner-1",
        "prop-A",
        "2026-03",
      );
      expect(result.rooms).toHaveLength(1);
      expect(result.rooms[0].roomId).toBe("room-1");
      expect(result.rooms[0].occupancyRate).toBeGreaterThan(0);
    });

    it("clamps occupancy rate to 1 when nights exceed days in month", async () => {
      // capacity is irrelevant: occupancy is computed as occupied/days.
      const room = {
        id: "room-1",
        propertyId: "prop-A",
        roomType: "deluxe",
        bedType: "king",
        viewType: "ocean",
        capacity: 2,
        totalRooms: 1,
        basePriceUsd: "100",
        status: "active",
      };
      // Reservation spanning the whole month
      const reservations: ReservationDto[] = [
        makeReservation({
          id: "r1",
          propertyId: "prop-A",
          roomId: "room-1",
          status: "confirmed",
          checkIn: "2026-03-01",
          checkOut: "2026-04-30",
        }),
      ];
      const inv = {
        listRoomsByProperty: jest.fn().mockResolvedValue([room]),
      } as unknown as InventoryClientService;
      const svc = makeSvc(makeBookingClient(reservations), inv);
      const result = await svc.getPropertyRooms(
        "partner-1",
        "prop-A",
        "2026-03",
      );
      expect(result.rooms[0].occupancyRate).toBeLessThanOrEqual(1);
    });

    it("returns occupancy=0 when no revenue-status reservations match the room", async () => {
      const room = {
        id: "room-1",
        propertyId: "prop-A",
        roomType: "deluxe",
        bedType: "king",
        viewType: "ocean",
        capacity: 2,
        totalRooms: 1,
        basePriceUsd: "100",
        status: "active",
      };
      const reservations: ReservationDto[] = [
        makeReservation({
          id: "r1",
          propertyId: "prop-A",
          roomId: "room-1",
          status: "cancelled",
          checkIn: "2026-03-01",
          checkOut: "2026-03-04",
        }),
      ];
      const inv = {
        listRoomsByProperty: jest.fn().mockResolvedValue([room]),
      } as unknown as InventoryClientService;
      const svc = makeSvc(makeBookingClient(reservations), inv);
      const result = await svc.getPropertyRooms(
        "partner-1",
        "prop-A",
        "2026-03",
      );
      expect(result.rooms[0].occupancyRate).toBe(0);
    });
  });
});
