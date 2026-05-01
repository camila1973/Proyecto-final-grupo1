import { DashboardService } from "./dashboard.service.js";
import { BookingClientService } from "../clients/booking-client.service.js";
import { PaymentClientService } from "../clients/payment-client.service.js";
import { InventoryClientService } from "../clients/inventory-client.service.js";
import type { ReservationDto } from "./dashboard.types.js";

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

function makePaymentClient(): PaymentClientService {
  return {
    getStatus: jest.fn().mockResolvedValue({
      id: "pay-1",
      reservationId: "r1",
      status: "captured",
      amountUsd: 300,
      currency: "USD",
      stripePaymentIntentId: "pi_pal_123456",
      guestEmail: "g@example.com",
      createdAt: "2026-03-02T00:00:00Z",
    }),
  } as unknown as PaymentClientService;
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
): InventoryClientService {
  return {
    listPropertiesByPartner: jest.fn().mockResolvedValue(properties),
  } as unknown as InventoryClientService;
}

describe("DashboardService", () => {
  describe("getHotelState", () => {
    it("filters by partnerId and month, computes confirmed/cancelled metrics", async () => {
      const data: ReservationDto[] = [
        makeReservation({ id: "r1", status: "confirmed", grandTotalUsd: 500 }),
        makeReservation({
          id: "r2",
          status: "cancelled",
          grandTotalUsd: 200,
        }),
        makeReservation({
          id: "r3",
          partnerId: "other-partner",
          status: "confirmed",
          grandTotalUsd: 999,
        }),
        makeReservation({
          id: "r4",
          status: "confirmed",
          checkIn: "2026-04-10",
          checkOut: "2026-04-12",
          grandTotalUsd: 700,
        }),
      ];
      const svc = new DashboardService(
        makeBookingClient(data),
        makePaymentClient(),
        makeInventoryClient(),
      );
      const result = await svc.getHotelState(
        "partner-1",
        "2026-03",
        null,
        null,
      );

      expect(result.metrics.confirmed).toBe(1);
      expect(result.metrics.cancelled).toBe(1);
      expect(result.metrics.revenueUsd).toBe(500);
      expect(result.metrics.lossesUsd).toBe(200);
      expect(result.metrics.netUsd).toBe(300);
      expect(result.reservations).toHaveLength(2);
    });

    it("filters by roomType (case-insensitive)", async () => {
      const data: ReservationDto[] = [
        makeReservation({
          id: "r1",
          snapshot: { roomType: "Doble Superior" },
        }),
        makeReservation({
          id: "r2",
          snapshot: { roomType: "Suite" },
        }),
      ];
      const svc = new DashboardService(
        makeBookingClient(data),
        makePaymentClient(),
        makeInventoryClient(),
      );
      const result = await svc.getHotelState(
        "partner-1",
        "2026-03",
        "doble superior",
        null,
      );
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].id).toBe("r1");
    });

    it("includes 6-month trailing series with target month last", async () => {
      const svc = new DashboardService(
        makeBookingClient([]),
        makePaymentClient(),
        makeInventoryClient(),
      );
      const result = await svc.getHotelState(
        "partner-1",
        "2026-06",
        null,
        null,
      );
      expect(result.monthlySeries).toHaveLength(6);
      expect(result.monthlySeries[5].month).toBe("2026-06");
      expect(result.monthlySeries[0].month).toBe("2026-01");
    });

    it("computes occupancy rate within [0, 1]", async () => {
      const data: ReservationDto[] = [
        makeReservation({
          id: "r1",
          status: "confirmed",
          checkIn: "2026-03-01",
          checkOut: "2026-03-31",
        }),
      ];
      const svc = new DashboardService(
        makeBookingClient(data),
        makePaymentClient(),
        makeInventoryClient(),
      );
      const result = await svc.getHotelState(
        "partner-1",
        "2026-03",
        null,
        null,
      );
      const march = result.monthlySeries.find((m) => m.month === "2026-03")!;
      expect(march.occupancyRate).toBeGreaterThan(0);
      expect(march.occupancyRate).toBeLessThanOrEqual(1);
    });

    it("returns 0 occupancy when no rooms in month", async () => {
      const svc = new DashboardService(
        makeBookingClient([]),
        makePaymentClient(),
        makeInventoryClient(),
      );
      const result = await svc.getHotelState(
        "partner-1",
        "2026-03",
        null,
        null,
      );
      expect(result.monthlySeries.every((p) => p.occupancyRate === 0)).toBe(
        true,
      );
    });

    it("renders dash placeholders when guest info is missing", async () => {
      const data: ReservationDto[] = [makeReservation({ guestInfo: null })];
      const svc = new DashboardService(
        makeBookingClient(data),
        makePaymentClient(),
        makeInventoryClient(),
      );
      const result = await svc.getHotelState(
        "partner-1",
        "2026-03",
        null,
        null,
      );
      expect(result.reservations[0].guestName).toBe("—");
      expect(result.reservations[0].guestEmail).toBe("—");
      expect(result.reservations[0].roomType).toBe("Doble Superior");
    });
  });

  describe("getPayments", () => {
    it("returns paginated rows with computed nights and commission", async () => {
      const data: ReservationDto[] = [
        makeReservation({
          id: "rA",
          status: "confirmed",
          checkIn: "2026-03-01",
          checkOut: "2026-03-09", // 8 nights
          grandTotalUsd: 1440.2,
        }),
        makeReservation({
          id: "rB",
          status: "confirmed",
          checkIn: "2026-03-10",
          checkOut: "2026-03-12", // 2 nights
          grandTotalUsd: 360,
        }),
      ];
      const svc = new DashboardService(
        makeBookingClient(data),
        makePaymentClient(),
        makeInventoryClient(),
      );
      const result = await svc.getPayments("partner-1", "2026-03", 1, 10, null);

      expect(result.total).toBe(2);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].nights).toBe(8);
      expect(result.rows[0].totalPaidUsd).toBe(1440.2);
      // 20% commission stored as negative
      expect(result.rows[0].commissionUsd).toBeLessThan(0);
      // earnings = total - commissionAbs
      expect(result.rows[0].earningsUsd).toBeCloseTo(1440.2 - 1440.2 * 0.2, 1);
      expect(result.rows[0].paymentMethod).toBe("STRIPE");
      expect(result.rows[0].reference).toBe("pi_pal_123456");
    });

    it("paginates when more rows than pageSize", async () => {
      const data = Array.from({ length: 5 }).map((_, i) =>
        makeReservation({
          id: `r${i}`,
          status: "confirmed",
        }),
      );
      const svc = new DashboardService(
        makeBookingClient(data),
        makePaymentClient(),
        makeInventoryClient(),
      );
      const page1 = await svc.getPayments("partner-1", "2026-03", 1, 2, null);
      const page2 = await svc.getPayments("partner-1", "2026-03", 2, 2, null);
      const page3 = await svc.getPayments("partner-1", "2026-03", 3, 2, null);

      expect(page1.rows).toHaveLength(2);
      expect(page2.rows).toHaveLength(2);
      expect(page3.rows).toHaveLength(1);
      expect(page1.total).toBe(5);
    });

    it("excludes reservations not in payment-eligible statuses", async () => {
      const data: ReservationDto[] = [
        makeReservation({ id: "r1", status: "held" }),
        makeReservation({ id: "r2", status: "expired" }),
        makeReservation({ id: "r3", status: "confirmed" }),
      ];
      const svc = new DashboardService(
        makeBookingClient(data),
        makePaymentClient(),
        makeInventoryClient(),
      );
      const result = await svc.getPayments("partner-1", "2026-03", 1, 10, null);
      expect(result.total).toBe(1);
      expect(result.rows[0].reservationId).toBe("r3");
    });

    it("returns all months when month is null", async () => {
      const data: ReservationDto[] = [
        makeReservation({
          id: "r1",
          status: "confirmed",
          checkIn: "2026-01-01",
          checkOut: "2026-01-03",
        }),
        makeReservation({
          id: "r2",
          status: "confirmed",
          checkIn: "2026-05-01",
          checkOut: "2026-05-03",
        }),
      ];
      const svc = new DashboardService(
        makeBookingClient(data),
        makePaymentClient(),
        makeInventoryClient(),
      );
      const result = await svc.getPayments("partner-1", null, 1, 10, null);
      expect(result.total).toBe(2);
    });

    it("falls back to '—' when no Stripe intent is recorded", async () => {
      const paymentClient = {
        getStatus: jest.fn().mockResolvedValue(null),
      } as unknown as PaymentClientService;
      const svc = new DashboardService(
        makeBookingClient([makeReservation({ id: "r1", status: "confirmed" })]),
        paymentClient,
        makeInventoryClient(),
      );
      const result = await svc.getPayments("partner-1", "2026-03", 1, 10, null);
      expect(result.rows[0].paymentMethod).toBe("—");
      expect(result.rows[0].reference).toBe("—");
    });

    it("scopes results to propertyId when provided", async () => {
      const data: ReservationDto[] = [
        makeReservation({
          id: "r1",
          propertyId: "prop-A",
          status: "confirmed",
        }),
        makeReservation({
          id: "r2",
          propertyId: "prop-B",
          status: "confirmed",
        }),
      ];
      const svc = new DashboardService(
        makeBookingClient(data),
        makePaymentClient(),
        makeInventoryClient(),
      );
      const result = await svc.getPayments(
        "partner-1",
        "2026-03",
        1,
        10,
        "prop-A",
      );
      expect(result.total).toBe(1);
      expect(result.rows[0].reservationId).toBe("r1");
    });
  });

  describe("getProperties", () => {
    it("returns properties from inventory-service mapped to PropertySummary", async () => {
      const svc = new DashboardService(
        makeBookingClient([]),
        makePaymentClient(),
        makeInventoryClient([INVENTORY_PROP_A]),
      );
      const result = await svc.getProperties("partner-1");

      expect(result.partnerId).toBe("partner-1");
      expect(result.properties).toHaveLength(1);
      const prop = result.properties[0];
      expect(prop.propertyId).toBe("prop-A");
      expect(prop.propertyName).toBe("Hotel Central Park");
      expect(prop.propertyCity).toBe("Bogotá");
      expect(prop.propertyCountryCode).toBe("CO");
    });

    it("returns empty array when inventory-service has no properties for partner", async () => {
      const svc = new DashboardService(
        makeBookingClient([]),
        makePaymentClient(),
        makeInventoryClient([]),
      );
      const result = await svc.getProperties("partner-1");
      expect(result.properties).toHaveLength(0);
    });

    it("maps multiple properties", async () => {
      const propB = {
        ...INVENTORY_PROP_A,
        id: "prop-B",
        name: "Hotel Plaza",
        city: "Medellín",
      };
      const svc = new DashboardService(
        makeBookingClient([]),
        makePaymentClient(),
        makeInventoryClient([INVENTORY_PROP_A, propB]),
      );
      const result = await svc.getProperties("partner-1");
      expect(result.properties).toHaveLength(2);
      const ids = result.properties.map((p) => p.propertyId);
      expect(ids).toContain("prop-A");
      expect(ids).toContain("prop-B");
    });

    it("initializes roomCount and reservationCount to 0", async () => {
      const svc = new DashboardService(
        makeBookingClient([]),
        makePaymentClient(),
        makeInventoryClient([INVENTORY_PROP_A]),
      );
      const result = await svc.getProperties("partner-1");
      expect(result.properties[0].roomCount).toBe(0);
      expect(result.properties[0].reservationCount).toBe(0);
    });
  });

  describe("getHotelState with propertyId", () => {
    it("scopes metrics to a single property when propertyId is provided", async () => {
      const data: ReservationDto[] = [
        makeReservation({ id: "r1", propertyId: "prop-A", grandTotalUsd: 400 }),
        makeReservation({ id: "r2", propertyId: "prop-B", grandTotalUsd: 600 }),
      ];
      const svc = new DashboardService(
        makeBookingClient(data),
        makePaymentClient(),
        makeInventoryClient(),
      );
      const result = await svc.getHotelState(
        "partner-1",
        "2026-03",
        null,
        "prop-A",
      );
      expect(result.propertyId).toBe("prop-A");
      expect(result.metrics.revenueUsd).toBe(400);
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].id).toBe("r1");
    });
  });
});
