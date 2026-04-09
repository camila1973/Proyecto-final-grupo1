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
    guest_id: "guest-uuid",
    check_in: "2026-05-01",
    check_out: "2026-05-04",
    status: "pending",
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

const CREATE_DTO = { ...PREVIEW_DTO, guestId: "guest-uuid" };

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("ReservationsService", () => {
  let service: ReservationsService;
  let fareCalculator: { calculate: jest.Mock };
  let reservationsRepo: {
    insert: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    toResponse: jest.Mock;
  };
  let roomLocationCache: { findByRoomId: jest.Mock };

  const fareBreakdown = makeFareBreakdown();
  const row = makeRow();

  beforeEach(() => {
    fareCalculator = { calculate: jest.fn().mockResolvedValue(fareBreakdown) };
    roomLocationCache = {
      findByRoomId: jest.fn().mockResolvedValue(LOCATION),
    };
    reservationsRepo = {
      insert: jest.fn().mockResolvedValue(row),
      findAll: jest.fn().mockResolvedValue([row, row]),
      findById: jest.fn().mockResolvedValue(row),
      toResponse: jest.fn().mockImplementation((r) => ({ id: r.id })),
    };
    service = new ReservationsService(
      fareCalculator as any,
      reservationsRepo as any,
      roomLocationCache as any,
      { publish: jest.fn() } as any,
    );
  });

  // ─── preview ────────────────────────────────────────────────────────────────

  describe("preview", () => {
    it("resolves location and returns fare breakdown", async () => {
      const result = await service.preview(PREVIEW_DTO);

      expect(roomLocationCache.findByRoomId).toHaveBeenCalledWith("room-uuid");
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
      roomLocationCache.findByRoomId.mockRejectedValue(
        new NotFoundException("No location"),
      );

      await expect(service.preview(PREVIEW_DTO)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("inserts a reservation with correct fields", async () => {
      await service.create(CREATE_DTO);

      expect(reservationsRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          property_id: "prop-uuid",
          room_id: "room-uuid",
          partner_id: "partner-uuid",
          guest_id: "guest-uuid",
          check_in: "2026-05-01",
          check_out: "2026-05-04",
          status: "pending",
          tax_total_usd: fareBreakdown.taxTotalUsd,
          fee_total_usd: fareBreakdown.feeTotalUsd,
          grand_total_usd: fareBreakdown.totalUsd,
        }),
      );
    });

    it("sets holdExpiresAt approximately 15 minutes from now", async () => {
      const before = Date.now();
      await service.create(CREATE_DTO);
      const after = Date.now();

      const inserted = reservationsRepo.insert.mock.calls[0][0];
      const holdMs = inserted.hold_expires_at.getTime();
      const expected = 15 * 60 * 1000;

      expect(holdMs).toBeGreaterThanOrEqual(before + expected - 50);
      expect(holdMs).toBeLessThanOrEqual(after + expected + 50);
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

    it("propagates fare calculation errors", async () => {
      fareCalculator.calculate.mockRejectedValue(
        new NotFoundException("No price"),
      );

      await expect(service.create(CREATE_DTO)).rejects.toThrow(
        NotFoundException,
      );
      expect(reservationsRepo.insert).not.toHaveBeenCalled();
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
        roomLocationCache as any,
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
