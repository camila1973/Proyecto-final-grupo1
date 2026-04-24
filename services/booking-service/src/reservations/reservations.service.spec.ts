import { NotFoundException } from "@nestjs/common";
import { ReservationsService } from "./reservations.service.js";
import { FareBreakdown } from "../fare/fare-calculator.service.js";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeFareBreakdown(): FareBreakdown {
  return {
    nights: 3,
    roomRateUsd: 150,
    subtotalUsd: 450,
    taxes: [{ name: "IVA", type: "PERCENTAGE", rate: 16, amountUsd: 72 }],
    fees: [],
    taxTotalUsd: 72,
    feeTotalUsd: 0,
    totalUsd: 522,
  };
}

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "res-uuid",
    property_id: "prop-uuid",
    room_id: "room-uuid",
    partner_id: "partner-uuid",
    booker_id: "booker-uuid",
    guest_info: {
      firstName: "Ana",
      lastName: "García",
      email: "ana@example.com",
    },
    check_in: "2026-05-01",
    check_out: "2026-05-04",
    status: "on_hold",
    fare_breakdown: null,
    tax_total_usd: "72.00",
    fee_total_usd: "0.00",
    grand_total_usd: "522.00",
    hold_expires_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

const LOCATION = { country: "MX", city: "cancún" };

const PREVIEW_DTO = {
  propertyId: "prop-uuid",
  roomId: "room-uuid",
  partnerId: "partner-uuid",
  checkIn: "2026-05-01",
  checkOut: "2026-05-04",
};

const HOLD_ID = "hold-uuid";
const HOLD_EXPIRES_AT = new Date(Date.now() + 900_000).toISOString();

// CREATE_DTO no longer includes holdId — hold is created internally
const CREATE_DTO = {
  ...PREVIEW_DTO,
  bookerId: "booker-uuid",
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("ReservationsService", () => {
  let service: ReservationsService;
  let fareCalculator: { calculate: jest.Mock };
  let reservationsRepo: {
    insert: jest.Mock;
    findAll: jest.Mock;
    findByBookerId: jest.Mock;
    findById: jest.Mock;
    findPendingByBookerAndStay: jest.Mock;
    updateGuestInfo: jest.Mock;
    toResponse: jest.Mock;
    confirm: jest.Mock;
  };
  let inventoryClient: {
    getRoomLocation: jest.Mock;
    confirmHold: jest.Mock;
  };
  let holdsService: {
    create: jest.Mock;
    release: jest.Mock;
  };

  const fareBreakdown = makeFareBreakdown();
  const row = makeRow();

  beforeEach(() => {
    fareCalculator = { calculate: jest.fn().mockResolvedValue(fareBreakdown) };
    inventoryClient = {
      getRoomLocation: jest.fn().mockResolvedValue(LOCATION),
      confirmHold: jest.fn().mockResolvedValue(undefined),
    };
    holdsService = {
      create: jest
        .fn()
        .mockResolvedValue({ holdId: HOLD_ID, expiresAt: HOLD_EXPIRES_AT }),
      release: jest.fn().mockResolvedValue(undefined),
    };
    reservationsRepo = {
      insert: jest.fn().mockResolvedValue(row),
      findAll: jest.fn().mockResolvedValue([row, row]),
      findByBookerId: jest.fn().mockResolvedValue([row]),
      findById: jest.fn().mockResolvedValue(row),
      findPendingByBookerAndStay: jest.fn().mockResolvedValue(null),
      updateGuestInfo: jest.fn().mockResolvedValue(row),
      toResponse: jest.fn().mockImplementation((r) => ({ id: r.id })),
      confirm: jest.fn(),
    };
    service = new ReservationsService(
      fareCalculator as any,
      reservationsRepo as any,
      inventoryClient as any,
      holdsService as any,
      { publish: jest.fn() } as any,
    );
  });

  // ─── preview ────────────────────────────────────────────────────────────────

  describe("preview", () => {
    it("resolves location and returns fare breakdown", async () => {
      const result = await service.preview(PREVIEW_DTO);

      expect(inventoryClient.getRoomLocation).toHaveBeenCalledWith("room-uuid");
      expect(fareCalculator.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: "prop-uuid",
          roomId: "room-uuid",
          partnerId: "partner-uuid",
          propertyLocation: LOCATION,
        }),
      );
      expect(result).toBe(fareBreakdown);
    });

    it("converts checkIn/checkOut strings to Date objects", async () => {
      await service.preview(PREVIEW_DTO);

      const { checkIn, checkOut } = fareCalculator.calculate.mock.calls[0][0];
      expect(checkIn).toBeInstanceOf(Date);
      expect(checkOut).toBeInstanceOf(Date);
    });

    it("propagates NotFoundException when location is not cached", async () => {
      inventoryClient.getRoomLocation.mockRejectedValue(
        new NotFoundException("No location"),
      );

      await expect(service.preview(PREVIEW_DTO)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a hold then inserts a reservation", async () => {
      await service.create(CREATE_DTO);

      expect(holdsService.create).toHaveBeenCalledWith({
        bookerId: "booker-uuid",
        roomId: "room-uuid",
        checkIn: "2026-05-01",
        checkOut: "2026-05-04",
      });
      expect(reservationsRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          property_id: "prop-uuid",
          room_id: "room-uuid",
          partner_id: "partner-uuid",
          booker_id: "booker-uuid",
          check_in: "2026-05-01",
          check_out: "2026-05-04",
          status: "on_hold",
          tax_total_usd: fareBreakdown.taxTotalUsd,
          fee_total_usd: fareBreakdown.feeTotalUsd,
          grand_total_usd: fareBreakdown.totalUsd,
        }),
      );
    });

    it("sets hold_expires_at from the hold response", async () => {
      await service.create(CREATE_DTO);

      const inserted = reservationsRepo.insert.mock.calls[0][0];
      expect(inserted.hold_expires_at).toEqual(new Date(HOLD_EXPIRES_AT));
    });

    it("does not include guest_info in the insert (DB default applies)", async () => {
      await service.create(CREATE_DTO);

      const inserted = reservationsRepo.insert.mock.calls[0][0];
      expect(inserted.guest_info).toBeUndefined();
    });

    it("returns fareBreakdown and holdExpiresAt in the response", async () => {
      const result = await service.create(CREATE_DTO);

      expect(result.fareBreakdown).toBe(fareBreakdown);
      expect(typeof result.holdExpiresAt).toBe("string");
    });

    it("stores fare_breakdown object in the DB", async () => {
      await service.create(CREATE_DTO);

      const inserted = reservationsRepo.insert.mock.calls[0][0];
      expect(inserted.fare_breakdown).toMatchObject({
        totalUsd: fareBreakdown.totalUsd,
      });
    });

    it("returns existing pending reservation without creating a new hold (idempotency)", async () => {
      const existingRow = makeRow({ fare_breakdown: fareBreakdown });
      reservationsRepo.findPendingByBookerAndStay.mockResolvedValue(
        existingRow,
      );

      const result = await service.create(CREATE_DTO);

      expect(holdsService.create).not.toHaveBeenCalled();
      expect(reservationsRepo.insert).not.toHaveBeenCalled();
      expect(result.id).toBe(existingRow.id);
    });

    it("releases the hold when fare calculation fails", async () => {
      fareCalculator.calculate.mockRejectedValue(
        new NotFoundException("No price"),
      );

      await expect(service.create(CREATE_DTO)).rejects.toThrow(
        NotFoundException,
      );
      expect(holdsService.release).toHaveBeenCalledWith(HOLD_ID);
      expect(reservationsRepo.insert).not.toHaveBeenCalled();
    });

    it("releases the hold when DB insert fails", async () => {
      reservationsRepo.insert.mockRejectedValue(new Error("DB error"));

      await expect(service.create(CREATE_DTO)).rejects.toThrow("DB error");
      expect(holdsService.release).toHaveBeenCalledWith(HOLD_ID);
    });

    it("propagates hold creation errors without inserting", async () => {
      holdsService.create.mockRejectedValue(new Error("inventory unavailable"));

      await expect(service.create(CREATE_DTO)).rejects.toThrow(
        "inventory unavailable",
      );
      expect(reservationsRepo.insert).not.toHaveBeenCalled();
    });
  });

  // ─── updateGuestInfo ─────────────────────────────────────────────────────────

  describe("updateGuestInfo", () => {
    it("delegates to repository and returns mapped response", async () => {
      const dto = {
        firstName: "Ana",
        lastName: "García",
        email: "ana@example.com",
        phone: "+52 1 555 123 4567",
      };

      await service.updateGuestInfo("res-uuid", dto);

      expect(reservationsRepo.updateGuestInfo).toHaveBeenCalledWith(
        "res-uuid",
        {
          firstName: "Ana",
          lastName: "García",
          email: "ana@example.com",
          phone: "+52 1 555 123 4567",
        },
      );
      expect(reservationsRepo.toResponse).toHaveBeenCalledWith(row);
    });

    it("propagates NotFoundException when reservation not found", async () => {
      reservationsRepo.updateGuestInfo.mockRejectedValue(
        new NotFoundException("Reservation not found"),
      );

      await expect(
        service.updateGuestInfo("bad-id", {
          firstName: "X",
          lastName: "Y",
          email: "x@y.com",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe("findAll", () => {
    it("returns total count and mapped reservations", async () => {
      const result = await service.findAll();

      expect(result.total).toBe(2);
      expect(result.reservations).toHaveLength(2);
    });

    it("calls toResponse for each row", async () => {
      await service.findAll();

      expect(reservationsRepo.toResponse).toHaveBeenCalledTimes(2);
    });

    it("filters by bookerId when provided", async () => {
      const result = await service.findAll("booker-uuid");

      expect(reservationsRepo.findByBookerId).toHaveBeenCalledWith(
        "booker-uuid",
      );
      expect(reservationsRepo.findAll).not.toHaveBeenCalled();
      expect(result.total).toBe(1);
    });

    it("returns all when bookerId is not provided", async () => {
      await service.findAll();

      expect(reservationsRepo.findAll).toHaveBeenCalled();
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────────

  describe("findOne", () => {
    it("returns the mapped reservation", async () => {
      await service.findOne("res-uuid");

      expect(reservationsRepo.findById).toHaveBeenCalledWith("res-uuid");
      expect(reservationsRepo.toResponse).toHaveBeenCalledWith(row);
    });

    it("propagates NotFoundException from repository", async () => {
      reservationsRepo.findById.mockRejectedValue(
        new NotFoundException("Reservation not found"),
      );

      await expect(service.findOne("bad-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── submitPayment ──────────────────────────────────────────────────────────

  describe("submitPayment", () => {
    it("delegates to repository and returns mapped response", async () => {
      const pendingRow = makeRow({ status: "pending" });
      reservationsRepo.submitPayment = jest.fn().mockResolvedValue(pendingRow);

      const result = await service.submitPayment("res-uuid");

      expect(reservationsRepo.submitPayment).toHaveBeenCalledWith("res-uuid");
      expect(reservationsRepo.toResponse).toHaveBeenCalledWith(pendingRow);
      expect(result).toEqual({ id: pendingRow.id });
    });
  });

  // ─── confirm ────────────────────────────────────────────────────────────────

  describe("confirm", () => {
    it("confirms the reservation and returns mapped response", async () => {
      const confirmedRow = makeRow({ status: "confirmed" });
      reservationsRepo.confirm = jest.fn().mockResolvedValue(confirmedRow);

      const result = await service.confirm("res-uuid");

      expect(reservationsRepo.confirm).toHaveBeenCalledWith("res-uuid");
      expect(reservationsRepo.toResponse).toHaveBeenCalledWith(confirmedRow);
      expect(result).toEqual({ id: confirmedRow.id });
    });

    it("converts the inventory hold to a reservation after confirming in DB", async () => {
      const confirmedRow = makeRow({ status: "confirmed" });
      reservationsRepo.confirm = jest.fn().mockResolvedValue(confirmedRow);

      await service.confirm("res-uuid");

      expect(inventoryClient.confirmHold).toHaveBeenCalledWith(
        confirmedRow.room_id,
        confirmedRow.check_in,
        confirmedRow.check_out,
      );
    });

    it("does not rethrow when inventory confirmHold fails", async () => {
      const confirmedRow = makeRow({ status: "confirmed" });
      reservationsRepo.confirm = jest.fn().mockResolvedValue(confirmedRow);
      inventoryClient.confirmHold.mockRejectedValue(
        new Error("inventory down"),
      );

      await expect(service.confirm("res-uuid")).resolves.not.toThrow();
    });

    it("defaults financial totals to 0 when row values are null", async () => {
      const nullFinancialsRow = makeRow({
        status: "confirmed",
        grand_total_usd: null,
        tax_total_usd: null,
        fee_total_usd: null,
      });
      reservationsRepo.confirm = jest.fn().mockResolvedValue(nullFinancialsRow);
      const publisher = { publish: jest.fn() };
      service = new (
        await import("./reservations.service.js")
      ).ReservationsService(
        fareCalculator as any,
        reservationsRepo as any,
        inventoryClient as any,
        holdsService as any,
        publisher as any,
      );

      await service.confirm("res-uuid");

      expect(publisher.publish).toHaveBeenCalledWith(
        "booking.confirmed",
        expect.objectContaining({
          grandTotalUsd: 0,
          taxTotalUsd: 0,
          feeTotalUsd: 0,
        }),
      );
    });

    it("publishes booking.confirmed event with financial totals", async () => {
      const confirmedRow = makeRow({
        status: "confirmed",
        grand_total_usd: "522.00",
        tax_total_usd: "72.00",
        fee_total_usd: "0.00",
      });
      reservationsRepo.confirm = jest.fn().mockResolvedValue(confirmedRow);
      const publisher = { publish: jest.fn() };
      service = new (
        await import("./reservations.service.js")
      ).ReservationsService(
        fareCalculator as any,
        reservationsRepo as any,
        inventoryClient as any,
        holdsService as any,
        publisher as any,
      );

      await service.confirm("res-uuid");

      expect(publisher.publish).toHaveBeenCalledWith(
        "booking.confirmed",
        expect.objectContaining({
          reservationId: confirmedRow.id,
          grandTotalUsd: 522,
          taxTotalUsd: 72,
          feeTotalUsd: 0,
        }),
      );
    });
  });
});
