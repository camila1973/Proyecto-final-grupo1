import {
  ConflictException,
  InternalServerErrorException,
} from "@nestjs/common";
import { PartnersService } from "./partners.service.js";
import type { PartnersRepository } from "./partners.repository.js";
import type { MembersRepository } from "../members/members.repository.js";
import type { AuthClientService } from "../clients/auth-client.service.js";
import type {
  PartnerRow,
  PartnerMemberRow,
} from "../database/database.types.js";
import { BookingClientService } from "../clients/booking-client.service.js";
import { PaymentClientService } from "../clients/payment-client.service.js";
import type { ReservationDto } from "./dashboard.types.js";

// ─── CRUD helpers ─────────────────────────────────────────────────────────────

function makeRepo(): jest.Mocked<
  Pick<
    PartnersRepository,
    "findAll" | "findById" | "findBySlug" | "insert" | "update" | "delete"
  >
> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

function makeAuthClient(): jest.Mocked<
  Pick<AuthClientService, "createOwnerUser">
> {
  return { createOwnerUser: jest.fn() };
}

function makePartnerUsersRepo(): jest.Mocked<
  Pick<MembersRepository, "insert">
> {
  return { insert: jest.fn() };
}

const PARTNER_ROW = (overrides: Partial<PartnerRow> = {}): PartnerRow => ({
  id: "partner-uuid-1",
  name: "Acme Hotels",
  slug: "acme-hotels",
  identifier: "PAR-0001",
  status: "active",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ...overrides,
});

const REGISTER_DTO = {
  orgName: "Acme Hotels",
  slug: "acme-hotels",
  firstName: "Jane",
  lastName: "Doe",
  ownerEmail: "jane@acme.com",
  ownerPassword: "supersecret123",
};

// ─── Dashboard helpers ────────────────────────────────────────────────────────

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

function makeDashboardSvc(
  bookingClient: BookingClientService,
  paymentClient: PaymentClientService,
): PartnersService {
  return new PartnersService(
    null as any,
    null as any,
    null as any,
    bookingClient,
    paymentClient,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PartnersService", () => {
  let service: PartnersService;
  let repo: ReturnType<typeof makeRepo>;
  let authClient: ReturnType<typeof makeAuthClient>;
  let partnerUsersRepo: ReturnType<typeof makePartnerUsersRepo>;

  beforeEach(() => {
    repo = makeRepo();
    authClient = makeAuthClient();
    partnerUsersRepo = makePartnerUsersRepo();
    repo.findBySlug.mockResolvedValue(null);
    repo.insert.mockResolvedValue(PARTNER_ROW());
    repo.delete.mockResolvedValue(undefined);
    authClient.createOwnerUser.mockResolvedValue({
      challengeId: "chal-uuid-1",
      userId: "user-uuid-1",
    });
    partnerUsersRepo.insert.mockResolvedValue({} as PartnerMemberRow);
    service = new PartnersService(
      repo as unknown as PartnersRepository,
      authClient as unknown as AuthClientService,
      partnerUsersRepo as unknown as MembersRepository,
      null as any,
      null as any,
    );
  });

  describe("findAll", () => {
    it("delegates to repo", async () => {
      repo.findAll.mockResolvedValue([PARTNER_ROW()]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(repo.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("findOne", () => {
    it("delegates to repo.findById", async () => {
      repo.findById.mockResolvedValue(PARTNER_ROW());
      const result = await service.findOne("partner-uuid-1");
      expect(result.id).toBe("partner-uuid-1");
      expect(repo.findById).toHaveBeenCalledWith("partner-uuid-1");
    });
  });

  describe("create", () => {
    it("inserts and returns the new partner", async () => {
      const result = await service.create({
        name: "Acme Hotels",
        slug: "acme-hotels",
      });
      expect(result.slug).toBe("acme-hotels");
      expect(repo.insert).toHaveBeenCalledWith({
        name: "Acme Hotels",
        slug: "acme-hotels",
      });
    });

    it("throws ConflictException when slug is taken", async () => {
      repo.findBySlug.mockResolvedValue(PARTNER_ROW());
      await expect(
        service.create({ name: "Acme Hotels", slug: "acme-hotels" }),
      ).rejects.toThrow(ConflictException);
      expect(repo.insert).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("delegates to repo.update", async () => {
      repo.update.mockResolvedValue(PARTNER_ROW({ name: "New Name" }));
      const result = await service.update("partner-uuid-1", {
        name: "New Name",
      });
      expect(result.name).toBe("New Name");
      expect(repo.update).toHaveBeenCalledWith("partner-uuid-1", {
        name: "New Name",
      });
    });
  });

  describe("register", () => {
    it("returns partner and challengeId on success", async () => {
      const result = await service.register(REGISTER_DTO);
      expect(result.partner.id).toBe("partner-uuid-1");
      expect(result.challengeId).toBe("chal-uuid-1");
    });

    it("creates partner then calls authClient with correct payload and inserts owner row", async () => {
      await service.register(REGISTER_DTO);
      expect(repo.insert).toHaveBeenCalledWith({
        name: "Acme Hotels",
        slug: "acme-hotels",
      });
      expect(authClient.createOwnerUser).toHaveBeenCalledWith({
        email: "jane@acme.com",
        password: "supersecret123",
        firstName: "Jane",
        lastName: "Doe",
        partnerId: "partner-uuid-1",
      });
      expect(partnerUsersRepo.insert).toHaveBeenCalledWith({
        partnerId: "partner-uuid-1",
        userId: "user-uuid-1",
        role: "owner",
        propertyId: null,
      });
    });

    it("throws ConflictException when slug is already taken", async () => {
      repo.findBySlug.mockResolvedValue(PARTNER_ROW());
      await expect(service.register(REGISTER_DTO)).rejects.toThrow(
        ConflictException,
      );
      expect(repo.insert).not.toHaveBeenCalled();
      expect(authClient.createOwnerUser).not.toHaveBeenCalled();
    });

    it("deletes the partner and rethrows when authClient fails", async () => {
      const authError = new InternalServerErrorException("auth-service down");
      authClient.createOwnerUser.mockRejectedValue(authError);
      await expect(service.register(REGISTER_DTO)).rejects.toThrow(authError);
      expect(repo.delete).toHaveBeenCalledWith("partner-uuid-1");
    });

    it("rethrows ConflictException from authClient (duplicate email)", async () => {
      authClient.createOwnerUser.mockRejectedValue(
        new ConflictException("Email is already registered"),
      );
      await expect(service.register(REGISTER_DTO)).rejects.toThrow(
        ConflictException,
      );
      expect(repo.delete).toHaveBeenCalledWith("partner-uuid-1");
    });

    it("still rethrows even when compensation delete also fails", async () => {
      authClient.createOwnerUser.mockRejectedValue(new Error("auth down"));
      repo.delete.mockRejectedValue(new Error("db down"));
      await expect(service.register(REGISTER_DTO)).rejects.toThrow("auth down");
    });
  });

  describe("getPartnerMetrics", () => {
    it("filters by partnerId and month, computes confirmed/cancelled metrics", async () => {
      const data: ReservationDto[] = [
        makeReservation({ id: "r1", status: "confirmed", grandTotalUsd: 500 }),
        makeReservation({ id: "r2", status: "cancelled", grandTotalUsd: 200 }),
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
      const svc = makeDashboardSvc(
        makeBookingClient(data),
        makePaymentClient(),
      );
      const result = await svc.getPartnerMetrics("partner-1", "2026-03", null);

      expect(result.metrics.confirmed).toBe(1);
      expect(result.metrics.cancelled).toBe(1);
      expect(result.metrics.revenueUsd).toBe(500);
      expect(result.metrics.lossesUsd).toBe(200);
      expect(result.metrics.netUsd).toBe(300);
    });

    it("includes 6-month trailing series with target month last", async () => {
      const svc = makeDashboardSvc(makeBookingClient([]), makePaymentClient());
      const result = await svc.getPartnerMetrics("partner-1", "2026-06", null);
      expect(result.monthlySeries).toHaveLength(6);
      expect(result.monthlySeries[5].month).toBe("2026-06");
      expect(result.monthlySeries[0].month).toBe("2026-01");
    });

    it("filters by roomType (case-insensitive)", async () => {
      const data: ReservationDto[] = [
        makeReservation({ id: "r1", snapshot: { roomType: "Doble Superior" } }),
        makeReservation({ id: "r2", snapshot: { roomType: "Suite" } }),
      ];
      const svc = makeDashboardSvc(
        makeBookingClient(data),
        makePaymentClient(),
      );
      const result = await svc.getPartnerMetrics(
        "partner-1",
        "2026-03",
        "doble superior",
      );
      expect(result.metrics.confirmed).toBe(1);
    });
  });

  describe("getPayments", () => {
    it("returns paginated rows with computed nights and commission", async () => {
      const data: ReservationDto[] = [
        makeReservation({
          id: "rA",
          status: "confirmed",
          checkIn: "2026-03-01",
          checkOut: "2026-03-09",
          grandTotalUsd: 1440.2,
        }),
        makeReservation({
          id: "rB",
          status: "confirmed",
          checkIn: "2026-03-10",
          checkOut: "2026-03-12",
          grandTotalUsd: 360,
        }),
      ];
      const svc = makeDashboardSvc(
        makeBookingClient(data),
        makePaymentClient(),
      );
      const result = await svc.getPayments("partner-1", "2026-03", 1, 10, null);

      expect(result.total).toBe(2);
      expect(result.rows[0].nights).toBe(8);
      expect(result.rows[0].totalPaidUsd).toBe(1440.2);
      expect(result.rows[0].commissionUsd).toBeLessThan(0);
      expect(result.rows[0].earningsUsd).toBeCloseTo(1440.2 - 1440.2 * 0.2, 1);
      expect(result.rows[0].paymentMethod).toBe("STRIPE");
    });

    it("paginates when more rows than pageSize", async () => {
      const data = Array.from({ length: 5 }).map((_, i) =>
        makeReservation({ id: `r${i}`, status: "confirmed" }),
      );
      const svc = makeDashboardSvc(
        makeBookingClient(data),
        makePaymentClient(),
      );
      const page1 = await svc.getPayments("partner-1", "2026-03", 1, 2, null);
      const page2 = await svc.getPayments("partner-1", "2026-03", 2, 2, null);
      expect(page1.rows).toHaveLength(2);
      expect(page2.rows).toHaveLength(2);
      expect(page1.total).toBe(5);
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
      const svc = makeDashboardSvc(
        makeBookingClient(data),
        makePaymentClient(),
      );
      const result = await svc.getPayments("partner-1", null, 1, 10, null);
      expect(result.total).toBe(2);
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
      const svc = makeDashboardSvc(
        makeBookingClient(data),
        makePaymentClient(),
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
});
