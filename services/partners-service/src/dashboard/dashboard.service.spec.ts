import { DashboardService } from "./dashboard.service.js";
import { BookingClientService } from "../clients/booking-client.service.js";
import { PaymentClientService } from "../clients/payment-client.service.js";
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
      );
      const result = await svc.getHotelState("partner-1", "2026-03", null);

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
      );
      const result = await svc.getHotelState(
        "partner-1",
        "2026-03",
        "doble superior",
      );
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].id).toBe("r1");
    });

    it("includes 6-month trailing series with target month last", async () => {
      const svc = new DashboardService(
        makeBookingClient([]),
        makePaymentClient(),
      );
      const result = await svc.getHotelState("partner-1", "2026-06", null);
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
      );
      const result = await svc.getHotelState("partner-1", "2026-03", null);
      const march = result.monthlySeries.find((m) => m.month === "2026-03")!;
      expect(march.occupancyRate).toBeGreaterThan(0);
      expect(march.occupancyRate).toBeLessThanOrEqual(1);
    });

    it("returns 0 occupancy when no rooms in month", async () => {
      const svc = new DashboardService(
        makeBookingClient([]),
        makePaymentClient(),
      );
      const result = await svc.getHotelState("partner-1", "2026-03", null);
      expect(result.monthlySeries.every((p) => p.occupancyRate === 0)).toBe(
        true,
      );
    });

    it("renders dash placeholders when guest info is missing", async () => {
      const data: ReservationDto[] = [makeReservation({ guestInfo: null })];
      const svc = new DashboardService(
        makeBookingClient(data),
        makePaymentClient(),
      );
      const result = await svc.getHotelState("partner-1", "2026-03", null);
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
      );
      const result = await svc.getPayments("partner-1", "2026-03", 1, 10);

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
      );
      const page1 = await svc.getPayments("partner-1", "2026-03", 1, 2);
      const page2 = await svc.getPayments("partner-1", "2026-03", 2, 2);
      const page3 = await svc.getPayments("partner-1", "2026-03", 3, 2);

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
      );
      const result = await svc.getPayments("partner-1", "2026-03", 1, 10);
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
      );
      const result = await svc.getPayments("partner-1", null, 1, 10);
      expect(result.total).toBe(2);
    });

    it("falls back to '—' when no Stripe intent is recorded", async () => {
      const paymentClient = {
        getStatus: jest.fn().mockResolvedValue(null),
      } as unknown as PaymentClientService;
      const svc = new DashboardService(
        makeBookingClient([makeReservation({ id: "r1", status: "confirmed" })]),
        paymentClient,
      );
      const result = await svc.getPayments("partner-1", "2026-03", 1, 10);
      expect(result.rows[0].paymentMethod).toBe("—");
      expect(result.rows[0].reference).toBe("—");
    });
  });
});
