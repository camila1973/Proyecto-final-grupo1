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
    function makeCapturedPaymentClient(
      rows: unknown[],
      totals?: {
        grossUsd: number;
        taxUsd: number;
        commissionUsd: number;
        netUsd: number;
        count: number;
      },
    ): { client: PaymentClientService; mock: jest.Mock } {
      const summed = totals ?? {
        grossUsd: 0,
        taxUsd: 0,
        commissionUsd: 0,
        netUsd: 0,
        count: rows.length,
      };
      const mock = jest.fn().mockResolvedValue({
        partnerId: "partner-1",
        from: "2026-03-01",
        to: "2026-04-01",
        currency: "USD",
        totals: summed,
        rows,
      });
      return {
        client: {
          getCapturedByPartner: mock,
        } as unknown as PaymentClientService,
        mock,
      };
    }

    function makeCaptured(
      overrides: Record<string, unknown> = {},
    ): Record<string, unknown> {
      return {
        paymentId: "pay-1",
        reservationId: "res-1",
        propertyId: "prop-1",
        propertyName: "Hotel Central",
        status: "captured",
        stripePaymentIntentId: "pi_abc",
        grossAmountUsd: 1190,
        taxAmountUsd: 190,
        commissionRate: 0.2,
        commissionAmountUsd: 238,
        netPayoutUsd: 952,
        capturedAt: "2026-03-05T12:00:00.000Z",
        createdAt: "2026-03-05T11:00:00.000Z",
        fareSnapshot: { nights: 2, roomRateUsd: 500 },
        ...overrides,
      };
    }

    it("maps captured rows and computes totals", async () => {
      const { client } = makeCapturedPaymentClient(
        [
          makeCaptured({ reservationId: "res-a", grossAmountUsd: 1190 }),
          makeCaptured({ reservationId: "res-b", grossAmountUsd: 360 }),
        ],
        {
          grossUsd: 1550,
          taxUsd: 247.45,
          commissionUsd: 310,
          netUsd: 1240,
          count: 2,
        },
      );
      const svc = makeDashboardSvc(makeBookingClient([]), client);

      const result = await svc.getPayments(
        "partner-1",
        "prop-1",
        "2026-03-01",
        "2026-04-01",
        1,
        10,
      );

      expect(result.total).toBe(2);
      expect(result.rows[0].reservationId).toBe("res-a");
      expect(result.rows[0].paymentMethod).toBe("STRIPE");
      expect(result.rows[0].totalPaidUsd).toBe(1190);
      expect(result.totals).toEqual({
        gross: 1550,
        commission: 310,
        net: 1240,
        count: 2,
      });
      expect(result.from).toBe("2026-03-01");
      expect(result.to).toBe("2026-04-01");
    });

    it("paginates when more rows than pageSize", async () => {
      const rows = Array.from({ length: 5 }).map((_, i) =>
        makeCaptured({ reservationId: `res-${i}` }),
      );
      const { client } = makeCapturedPaymentClient(rows);
      const svc = makeDashboardSvc(makeBookingClient([]), client);

      const page1 = await svc.getPayments(
        "partner-1",
        "prop-1",
        "2026-03-01",
        "2026-04-01",
        1,
        2,
      );
      const page2 = await svc.getPayments(
        "partner-1",
        "prop-1",
        "2026-03-01",
        "2026-04-01",
        2,
        2,
      );
      expect(page1.rows).toHaveLength(2);
      expect(page2.rows).toHaveLength(2);
      expect(page1.total).toBe(5);
      expect(page1.totals.count).toBe(5);
    });

    it("forwards propertyId to the captured-by-partner client", async () => {
      const { client, mock } = makeCapturedPaymentClient([]);
      const svc = makeDashboardSvc(makeBookingClient([]), client);

      await svc.getPayments(
        "partner-1",
        "prop-A",
        "2026-03-01",
        "2026-04-01",
        1,
        10,
      );

      expect(mock).toHaveBeenCalledWith(
        "partner-1",
        "2026-03-01",
        "2026-04-01",
        "prop-A",
      );
    });

    it("passes undefined propertyId when null", async () => {
      const { client, mock } = makeCapturedPaymentClient([]);
      const svc = makeDashboardSvc(makeBookingClient([]), client);

      const result = await svc.getPayments(
        "partner-1",
        null,
        "2026-03-01",
        "2026-04-01",
        1,
        10,
      );

      expect(mock).toHaveBeenCalledWith(
        "partner-1",
        "2026-03-01",
        "2026-04-01",
        undefined,
      );
      expect(result.propertyId).toBeNull();
    });

    it("returns empty payload when no captured payments", async () => {
      const { client } = makeCapturedPaymentClient([]);
      const svc = makeDashboardSvc(makeBookingClient([]), client);

      const result = await svc.getPayments(
        "partner-1",
        "prop-1",
        "2026-03-01",
        "2026-04-01",
        1,
        10,
      );
      expect(result.total).toBe(0);
      expect(result.rows).toEqual([]);
      expect(result.totals.count).toBe(0);
    });

    it("throws ServiceUnavailable when payment-service is down", async () => {
      const client = {
        getCapturedByPartner: jest.fn().mockResolvedValue(null),
      } as unknown as PaymentClientService;
      const svc = makeDashboardSvc(makeBookingClient([]), client);

      await expect(
        svc.getPayments(
          "partner-1",
          "prop-1",
          "2026-03-01",
          "2026-04-01",
          1,
          10,
        ),
      ).rejects.toThrow(/payment-service unavailable/);
    });
  });

  describe("getDisbursementHistory", () => {
    function makePaymentClientWith(
      historyResult: unknown,
    ): PaymentClientService {
      return {
        getDisbursementHistory: jest.fn().mockResolvedValue(historyResult),
      } as unknown as PaymentClientService;
    }

    it("rejects bad date formats", async () => {
      const svc = makeDashboardSvc(
        makeBookingClient([]),
        makePaymentClientWith(null),
      );
      await expect(
        svc.getDisbursementHistory("partner-1", "bad", "2026-05-01", null),
      ).rejects.toThrow(/from/);
    });

    it("throws ServiceUnavailable when payment-service is down", async () => {
      const svc = makeDashboardSvc(
        makeBookingClient([]),
        makePaymentClientWith(null),
      );
      await expect(
        svc.getDisbursementHistory(
          "partner-1",
          "2026-01-01",
          "2026-05-01",
          null,
        ),
      ).rejects.toThrow(/payment-service/);
    });

    it("delegates and returns the history response unchanged", async () => {
      const fixture = {
        partnerId: "partner-1",
        from: "2026-01-01",
        to: "2026-05-01",
        currency: "USD" as const,
        totals: { gross: 100, tax: 19, partnerFee: 5, commission: 20, net: 75 },
        paymentCount: 1,
        months: [],
      };
      const client = makePaymentClientWith(fixture);
      const svc = makeDashboardSvc(makeBookingClient([]), client);
      const result = await svc.getDisbursementHistory(
        "partner-1",
        "2026-01-01",
        "2026-05-01",
        "prop-A",
      );
      expect(result).toEqual(fixture);
      const mockFn = (
        client as unknown as { getDisbursementHistory: jest.Mock }
      ).getDisbursementHistory;
      expect(mockFn).toHaveBeenCalledWith(
        "partner-1",
        "2026-01-01",
        "2026-05-01",
        "prop-A",
      );
    });
  });
});
