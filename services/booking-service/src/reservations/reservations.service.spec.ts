import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
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
    status: "held",
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
    findHoldByBookerAndStay: jest.Mock;
    findHeldByBookerId: jest.Mock;
    updateGuestInfo: jest.Mock;
    toResponse: jest.Mock;
    confirm: jest.Mock;
    submit: jest.Mock;
    fail: jest.Mock;
    cancel: jest.Mock;
    expire: jest.Mock;
    rehold: jest.Mock;
    checkin: jest.Mock;
    checkOut: jest.Mock;
    modify: jest.Mock;
  };
  let publisher: { publish: jest.Mock };
  let partnersClient: { getCheckinKey: jest.Mock };
  let paymentClient: { requestRefund: jest.Mock };
  let inventoryClient: {
    getRoomLocation: jest.Mock;
    getRoomDetails: jest.Mock;
    getPropertySnapshot: jest.Mock;
    hold: jest.Mock;
    confirmHold: jest.Mock;
    unhold: jest.Mock;
    release: jest.Mock;
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
      getRoomDetails: jest
        .fn()
        .mockResolvedValue({ ...LOCATION, roomType: "Suite" }),
      getPropertySnapshot: jest.fn().mockResolvedValue({
        name: "Hotel Test",
        thumbnailUrl: null,
        neighborhood: null,
        city: "cancún",
        countryCode: "MX",
      }),
      hold: jest.fn().mockResolvedValue(undefined),
      confirmHold: jest.fn().mockResolvedValue(undefined),
      unhold: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };
    holdsService = {
      create: jest
        .fn()
        .mockResolvedValue({ holdId: HOLD_ID, expiresAt: HOLD_EXPIRES_AT }),
      release: jest.fn().mockResolvedValue(undefined),
    };
    publisher = { publish: jest.fn() };
    partnersClient = { getCheckinKey: jest.fn().mockResolvedValue("test-key") };
    paymentClient = {
      requestRefund: jest.fn().mockResolvedValue({
        status: "succeeded",
        policy: "full_refund",
        refundedUsd: 522,
        externalRef: "re_test_123",
        adjustmentId: "adj-uuid",
      }),
    };
    reservationsRepo = {
      insert: jest.fn().mockResolvedValue(row),
      findAll: jest.fn().mockResolvedValue([row, row]),
      findByBookerId: jest.fn().mockResolvedValue([row]),
      findById: jest.fn().mockResolvedValue(row),
      findHoldByBookerAndStay: jest.fn().mockResolvedValue(null),
      findHeldByBookerId: jest.fn().mockResolvedValue(null),
      updateGuestInfo: jest.fn().mockResolvedValue(row),
      toResponse: jest.fn().mockImplementation((r) => ({ id: r.id })),
      confirm: jest.fn(),
      submit: jest.fn().mockResolvedValue(row),
      fail: jest.fn(),
      cancel: jest.fn(),
      expire: jest.fn().mockResolvedValue(makeRow({ status: "expired" })),
      rehold: jest.fn().mockResolvedValue(row),
      checkin: jest.fn().mockResolvedValue(makeRow({ status: "checked_in" })),
      checkOut: jest.fn().mockResolvedValue(makeRow({ status: "checked_out" })),
      modify: jest.fn().mockImplementation(async (_id, fields) =>
        makeRow({
          ...(fields.checkIn ? { check_in: fields.checkIn } : {}),
          ...(fields.checkOut ? { check_out: fields.checkOut } : {}),
          ...(fields.guestInfo ? { guest_info: fields.guestInfo } : {}),
        }),
      ),
    };
    service = new ReservationsService(
      fareCalculator as any,
      reservationsRepo as any,
      inventoryClient as any,
      holdsService as any,
      publisher as any,
      partnersClient as any,
      paymentClient as any,
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
          status: "held",
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

    it("returns existing held reservation without creating a new hold (idempotency)", async () => {
      const existingRow = makeRow({ fare_breakdown: fareBreakdown });
      reservationsRepo.findHoldByBookerAndStay.mockResolvedValue(existingRow);

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

    it("expires a stale held reservation before creating a new one", async () => {
      const staleRow = makeRow({ id: "stale-uuid", status: "held" });
      reservationsRepo.findHeldByBookerId.mockResolvedValue(staleRow);
      reservationsRepo.expire = jest
        .fn()
        .mockResolvedValue({ ...staleRow, status: "expired" });

      await service.create(CREATE_DTO);

      expect(reservationsRepo.expire).toHaveBeenCalledWith(
        "stale-uuid",
        "superseded by new hold",
      );
      expect(reservationsRepo.insert).toHaveBeenCalled();
    });

    it("continues creating the reservation even when stale hold expiry fails", async () => {
      const staleRow = makeRow({ id: "stale-uuid", status: "held" });
      reservationsRepo.findHeldByBookerId.mockResolvedValue(staleRow);
      reservationsRepo.expire = jest
        .fn()
        .mockRejectedValue(new Error("expire failed"));

      await expect(service.create(CREATE_DTO)).resolves.toBeDefined();
      expect(reservationsRepo.insert).toHaveBeenCalled();
    });

    it("stores the property snapshot in the reservation row", async () => {
      await service.create(CREATE_DTO);

      const inserted = reservationsRepo.insert.mock.calls[0][0];
      expect(inserted.snapshot).toMatchObject({
        propertyName: "Hotel Test",
        roomType: "Suite",
      });
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

  // ─── submit ─────────────────────────────────────────────────────────────────

  describe("submit", () => {
    it("delegates to repository and returns mapped response", async () => {
      const submittedRow = makeRow({ status: "submitted" });
      reservationsRepo.submit = jest.fn().mockResolvedValue(submittedRow);

      const result = await service.submit("res-uuid");

      expect(reservationsRepo.submit).toHaveBeenCalledWith("res-uuid");
      expect(reservationsRepo.toResponse).toHaveBeenCalledWith(submittedRow);
      expect(result).toEqual({ id: submittedRow.id });
    });
  });

  // ─── fail ───────────────────────────────────────────────────────────────────

  describe("fail", () => {
    it("delegates to repository with reason and returns mapped response", async () => {
      const failedRow = makeRow({ status: "failed", reason: "card declined" });
      reservationsRepo.fail = jest.fn().mockResolvedValue(failedRow);

      await service.fail("res-uuid", "card declined");

      expect(reservationsRepo.fail).toHaveBeenCalledWith(
        "res-uuid",
        "card declined",
      );
      expect(reservationsRepo.toResponse).toHaveBeenCalledWith(failedRow);
    });

    it("calls inventoryClient.unhold after marking as failed", async () => {
      const failedRow = makeRow({ status: "failed" });
      reservationsRepo.fail = jest.fn().mockResolvedValue(failedRow);

      await service.fail("res-uuid", "card declined");

      expect(inventoryClient.unhold).toHaveBeenCalledWith(
        failedRow.room_id,
        failedRow.check_in,
        failedRow.check_out,
      );
    });

    it("does not rethrow when inventoryClient.unhold fails", async () => {
      reservationsRepo.fail = jest
        .fn()
        .mockResolvedValue(makeRow({ status: "failed" }));
      inventoryClient.unhold.mockRejectedValue(new Error("inventory down"));

      await expect(
        service.fail("res-uuid", "card declined"),
      ).resolves.not.toThrow();
    });

    it("propagates NotFoundException when reservation is not submitted", async () => {
      reservationsRepo.fail = jest
        .fn()
        .mockRejectedValue(new NotFoundException("not submitted"));

      await expect(service.fail("res-uuid", "card declined")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("publishes booking.failed with actor=system and the reason", async () => {
      const failedRow = makeRow({ status: "failed", reason: "card declined" });
      reservationsRepo.fail = jest.fn().mockResolvedValue(failedRow);

      await service.fail("res-uuid", "card declined");

      expect(publisher.publish).toHaveBeenCalledWith(
        "booking.failed",
        expect.objectContaining({
          routingKey: "booking.failed",
          reservationId: failedRow.id,
          actor: "system",
          reason: "card declined",
        }),
      );
    });
  });

  // ─── cancel ─────────────────────────────────────────────────────────────────

  describe("cancel", () => {
    it("calls inventoryClient.unhold when cancelling a held reservation", async () => {
      const cancelledRow = makeRow({
        status: "cancelled",
        reason: "changed mind",
      });
      reservationsRepo.cancel = jest
        .fn()
        .mockResolvedValue({ row: cancelledRow, priorStatus: "held" });

      await service.cancel("res-uuid", "changed mind");

      expect(inventoryClient.unhold).toHaveBeenCalledWith(
        cancelledRow.room_id,
        cancelledRow.check_in,
        cancelledRow.check_out,
      );
      expect(inventoryClient.release).not.toHaveBeenCalled();
    });

    it("calls inventoryClient.unhold when cancelling a submitted reservation", async () => {
      const cancelledRow = makeRow({ status: "cancelled" });
      reservationsRepo.cancel = jest
        .fn()
        .mockResolvedValue({ row: cancelledRow, priorStatus: "submitted" });

      await service.cancel("res-uuid", "changed mind");

      expect(inventoryClient.unhold).toHaveBeenCalledWith(
        cancelledRow.room_id,
        cancelledRow.check_in,
        cancelledRow.check_out,
      );
    });

    it("calls inventoryClient.release when cancelling a confirmed reservation", async () => {
      const cancelledRow = makeRow({ status: "cancelled" });
      reservationsRepo.cancel = jest
        .fn()
        .mockResolvedValue({ row: cancelledRow, priorStatus: "confirmed" });

      await service.cancel("res-uuid", "changed mind");

      expect(inventoryClient.release).toHaveBeenCalledWith(
        cancelledRow.room_id,
        cancelledRow.check_in,
        cancelledRow.check_out,
      );
      expect(inventoryClient.unhold).not.toHaveBeenCalled();
    });

    it("calls no inventory method when cancelling a failed reservation", async () => {
      const cancelledRow = makeRow({ status: "cancelled" });
      reservationsRepo.cancel = jest
        .fn()
        .mockResolvedValue({ row: cancelledRow, priorStatus: "failed" });

      await service.cancel("res-uuid", "giving up");

      expect(inventoryClient.unhold).not.toHaveBeenCalled();
      expect(inventoryClient.release).not.toHaveBeenCalled();
    });

    it("does not rethrow when inventory call fails", async () => {
      const cancelledRow = makeRow({ status: "cancelled" });
      reservationsRepo.cancel = jest
        .fn()
        .mockResolvedValue({ row: cancelledRow, priorStatus: "confirmed" });
      inventoryClient.release.mockRejectedValue(new Error("inventory down"));

      await expect(
        service.cancel("res-uuid", "changed mind"),
      ).resolves.not.toThrow();
    });

    it("propagates NotFoundException when reservation is already terminal", async () => {
      reservationsRepo.cancel = jest
        .fn()
        .mockRejectedValue(new NotFoundException("already terminal"));

      await expect(service.cancel("res-uuid", "changed mind")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("publishes booking.cancelled with actor=guest and the reason", async () => {
      const cancelledRow = makeRow({
        status: "cancelled",
        reason: "changed mind",
      });
      reservationsRepo.cancel = jest
        .fn()
        .mockResolvedValue({ row: cancelledRow, priorStatus: "confirmed" });

      await service.cancel("res-uuid", "changed mind");

      expect(publisher.publish).toHaveBeenCalledWith(
        "booking.cancelled",
        expect.objectContaining({
          routingKey: "booking.cancelled",
          reservationId: cancelledRow.id,
          actor: "guest",
          reason: "changed mind",
        }),
      );
    });

    it("returns mapped response with null refund for non-confirmed cancellations", async () => {
      const cancelledRow = makeRow({
        status: "cancelled",
        reason: "changed mind",
      });
      reservationsRepo.cancel = jest
        .fn()
        .mockResolvedValue({ row: cancelledRow, priorStatus: "held" });

      const result = await service.cancel("res-uuid", "changed mind");

      expect(reservationsRepo.toResponse).toHaveBeenCalledWith(cancelledRow);
      expect(result).toEqual({ id: cancelledRow.id, refund: null });
      expect(paymentClient.requestRefund).not.toHaveBeenCalled();
    });

    it("triggers automated refund only for prior status=confirmed", async () => {
      const cancelledRow = makeRow({ status: "cancelled" });
      reservationsRepo.cancel = jest
        .fn()
        .mockResolvedValue({ row: cancelledRow, priorStatus: "confirmed" });

      const result = await service.cancel("res-uuid", "changed mind", "guest", {
        actorId: "user-7",
        requestIp: "10.0.0.1",
      });

      expect(paymentClient.requestRefund).toHaveBeenCalledWith({
        reservationId: "res-uuid",
        reason: "changed mind",
        actorId: "user-7",
        actorRole: "guest",
        requestIp: "10.0.0.1",
      });
      expect(result.refund).toEqual(
        expect.objectContaining({ status: "succeeded", refundedUsd: 522 }),
      );
    });

    it("does not call paymentClient for prior status=submitted (no captured payment yet)", async () => {
      const cancelledRow = makeRow({ status: "cancelled" });
      reservationsRepo.cancel = jest
        .fn()
        .mockResolvedValue({ row: cancelledRow, priorStatus: "submitted" });

      await service.cancel("res-uuid", "changed mind");

      expect(paymentClient.requestRefund).not.toHaveBeenCalled();
    });

    it("swallows payment-service errors so cancellation still succeeds", async () => {
      const cancelledRow = makeRow({ status: "cancelled" });
      reservationsRepo.cancel = jest
        .fn()
        .mockResolvedValue({ row: cancelledRow, priorStatus: "confirmed" });
      paymentClient.requestRefund.mockRejectedValue(
        new Error("payment-service unreachable"),
      );

      const result = await service.cancel("res-uuid", "changed mind");

      expect(result).toEqual({ id: cancelledRow.id, refund: null });
    });

    it("partner actor on confirmed reservation calls repo.cancel and releases inventory", async () => {
      const confirmedRow = makeRow({ status: "confirmed" });
      const cancelledRow = makeRow({
        status: "cancelled",
        reason: "overbooking",
      });
      reservationsRepo.findById = jest.fn().mockResolvedValue(confirmedRow);
      reservationsRepo.cancel = jest
        .fn()
        .mockResolvedValue({ row: cancelledRow, priorStatus: "confirmed" });

      await service.cancel("res-uuid", "overbooking", "partner");

      expect(reservationsRepo.findById).toHaveBeenCalledWith("res-uuid");
      expect(reservationsRepo.cancel).toHaveBeenCalledWith(
        "res-uuid",
        "overbooking",
      );
      expect(inventoryClient.release).toHaveBeenCalledWith(
        cancelledRow.room_id,
        cancelledRow.check_in,
        cancelledRow.check_out,
      );
    });

    it("partner actor publishes booking.cancelled with actor=partner", async () => {
      const confirmedRow = makeRow({ status: "confirmed" });
      const cancelledRow = makeRow({
        status: "cancelled",
        reason: "overbooking",
      });
      reservationsRepo.findById = jest.fn().mockResolvedValue(confirmedRow);
      reservationsRepo.cancel = jest
        .fn()
        .mockResolvedValue({ row: cancelledRow, priorStatus: "confirmed" });

      await service.cancel("res-uuid", "overbooking", "partner");

      expect(publisher.publish).toHaveBeenCalledWith(
        "booking.cancelled",
        expect.objectContaining({
          routingKey: "booking.cancelled",
          actor: "partner",
          reason: "overbooking",
        }),
      );
    });

    it("partner actor on non-confirmed reservation throws BadRequestException", async () => {
      reservationsRepo.findById = jest
        .fn()
        .mockResolvedValue(makeRow({ status: "held" }));

      await expect(
        service.cancel("res-uuid", "overbooking", "partner"),
      ).rejects.toThrow(BadRequestException);

      expect(reservationsRepo.cancel).not.toHaveBeenCalled();
    });
  });

  // ─── expire ─────────────────────────────────────────────────────────────────

  describe("expire", () => {
    it("unholds inventory and returns mapped response for a held reservation", async () => {
      const expiredRow = makeRow({
        status: "expired",
        reason: "superseded by new hold",
      });
      reservationsRepo.expire = jest.fn().mockResolvedValue(expiredRow);

      const result = await service.expire("res-uuid", "superseded by new hold");

      expect(reservationsRepo.expire).toHaveBeenCalledWith(
        "res-uuid",
        "superseded by new hold",
      );
      expect(inventoryClient.unhold).toHaveBeenCalledWith(
        expiredRow.room_id,
        expiredRow.check_in,
        expiredRow.check_out,
      );
      expect(result).toEqual({ id: expiredRow.id });
    });

    it("returns undefined without calling unhold when row is not held", async () => {
      reservationsRepo.expire = jest.fn().mockResolvedValue(undefined);

      const result = await service.expire("res-uuid", "superseded by new hold");

      expect(inventoryClient.unhold).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it("does not rethrow when inventory unhold fails", async () => {
      const expiredRow = makeRow({ status: "expired" });
      reservationsRepo.expire = jest.fn().mockResolvedValue(expiredRow);
      inventoryClient.unhold.mockRejectedValue(new Error("inventory down"));

      await expect(
        service.expire("res-uuid", "superseded by new hold"),
      ).resolves.not.toThrow();
    });

    it("publishes booking.expired with actor=system and the reason", async () => {
      const expiredRow = makeRow({
        status: "expired",
        reason: "hold timeout",
      });
      reservationsRepo.expire = jest.fn().mockResolvedValue(expiredRow);

      await service.expire("res-uuid", "hold timeout");

      expect(publisher.publish).toHaveBeenCalledWith(
        "booking.expired",
        expect.objectContaining({
          routingKey: "booking.expired",
          reservationId: expiredRow.id,
          actor: "system",
          reason: "hold timeout",
        }),
      );
    });

    it("does not publish when row is undefined", async () => {
      reservationsRepo.expire = jest.fn().mockResolvedValue(undefined);

      await service.expire("res-uuid", "hold timeout");

      expect(publisher.publish).not.toHaveBeenCalled();
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

    it("publishes booking.confirmed with actor=system by default", async () => {
      const confirmedRow = makeRow({ status: "confirmed" });
      reservationsRepo.confirm = jest.fn().mockResolvedValue(confirmedRow);

      await service.confirm("res-uuid");

      expect(publisher.publish).toHaveBeenCalledWith(
        "booking.confirmed",
        expect.objectContaining({
          routingKey: "booking.confirmed",
          reservationId: confirmedRow.id,
          actor: "system",
          guestInfo: confirmedRow.guest_info,
        }),
      );
    });

    it("publishes booking.confirmed with actor=partner when actor is passed", async () => {
      const confirmedRow = makeRow({ status: "confirmed" });
      reservationsRepo.confirm = jest.fn().mockResolvedValue(confirmedRow);

      await service.confirm("res-uuid", "partner");

      expect(publisher.publish).toHaveBeenCalledWith(
        "booking.confirmed",
        expect.objectContaining({
          routingKey: "booking.confirmed",
          reservationId: confirmedRow.id,
          actor: "partner",
        }),
      );
    });
  });

  // ─── rehold ──────────────────────────────────────────────────────────────────

  describe("rehold", () => {
    it("calls findById, holdsService.create, and repo.rehold with the new expiry", async () => {
      const failedRow = makeRow({ status: "failed" });
      reservationsRepo.findById = jest.fn().mockResolvedValue(failedRow);

      await service.rehold("res-uuid");

      expect(reservationsRepo.findById).toHaveBeenCalledWith("res-uuid");
      expect(holdsService.create).toHaveBeenCalledWith({
        bookerId: failedRow.booker_id,
        roomId: failedRow.room_id,
        checkIn: failedRow.check_in,
        checkOut: failedRow.check_out,
      });
      expect(reservationsRepo.rehold).toHaveBeenCalledWith(
        "res-uuid",
        expect.any(Date),
      );
    });

    it("returns the mapped response", async () => {
      const reheld = makeRow({ status: "held" });
      reservationsRepo.rehold = jest.fn().mockResolvedValue(reheld);

      const result = await service.rehold("res-uuid");

      expect(reservationsRepo.toResponse).toHaveBeenCalledWith(reheld);
      expect(result).toEqual({ id: reheld.id });
    });

    it("releases the new hold when repo.rehold fails", async () => {
      reservationsRepo.rehold = jest
        .fn()
        .mockRejectedValue(new NotFoundException("not failed"));

      await expect(service.rehold("res-uuid")).rejects.toThrow(
        NotFoundException,
      );

      expect(holdsService.release).toHaveBeenCalledWith(HOLD_ID);
    });

    it("does not rethrow the hold-release error when release itself fails", async () => {
      reservationsRepo.rehold = jest
        .fn()
        .mockRejectedValue(new NotFoundException("not failed"));
      holdsService.release = jest
        .fn()
        .mockRejectedValue(new Error("redis down"));

      await expect(service.rehold("res-uuid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── partnerCheckin ──────────────────────────────────────────────────────────

  describe("partnerCheckin", () => {
    const CONFIRMED_ROW = makeRow({
      status: "confirmed",
      partner_id: "partner-uuid",
    });

    beforeEach(() => {
      reservationsRepo.findById = jest.fn().mockResolvedValue(CONFIRMED_ROW);
      reservationsRepo.checkin = jest
        .fn()
        .mockResolvedValue(makeRow({ status: "checked_in" }));
    });

    it("checks in the reservation and returns mapped response", async () => {
      const result = await service.partnerCheckin("res-uuid", "partner-uuid");

      expect(reservationsRepo.findById).toHaveBeenCalledWith("res-uuid");
      expect(reservationsRepo.checkin).toHaveBeenCalledWith("res-uuid");
      expect(result).toEqual({ id: "res-uuid" });
    });

    it("throws ForbiddenException when partnerId is empty", async () => {
      await expect(service.partnerCheckin("res-uuid", "")).rejects.toThrow(
        ForbiddenException,
      );
      expect(reservationsRepo.findById).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException when partnerId does not match the reservation", async () => {
      await expect(
        service.partnerCheckin("res-uuid", "other-partner"),
      ).rejects.toThrow(ForbiddenException);
      expect(reservationsRepo.checkin).not.toHaveBeenCalled();
    });

    it("throws BadRequestException when reservation is not confirmed", async () => {
      reservationsRepo.findById = jest
        .fn()
        .mockResolvedValue(
          makeRow({ status: "held", partner_id: "partner-uuid" }),
        );

      await expect(
        service.partnerCheckin("res-uuid", "partner-uuid"),
      ).rejects.toThrow(BadRequestException);
      expect(reservationsRepo.checkin).not.toHaveBeenCalled();
    });

    it("publishes booking.checked_in with actor=partner", async () => {
      await service.partnerCheckin("res-uuid", "partner-uuid");

      expect(publisher.publish).toHaveBeenCalledWith(
        "booking.checked_in",
        expect.objectContaining({
          routingKey: "booking.checked_in",
          actor: "partner",
        }),
      );
    });

    it("does not call partnersClient.getCheckinKey (no key validation for partners)", async () => {
      await service.partnerCheckin("res-uuid", "partner-uuid");

      expect(partnersClient.getCheckinKey).not.toHaveBeenCalled();
    });
  });

  // ─── checkin ────────────────────────────────────────────────────────────────

  describe("checkin", () => {
    const TODAY = new Date().toISOString().slice(0, 10);
    const TOMORROW = new Date(Date.now() + 86_400_000)
      .toISOString()
      .slice(0, 10);
    const CONFIRMED_ROW = makeRow({
      status: "confirmed",
      booker_id: "booker-uuid",
      check_in: TODAY,
      check_out: TOMORROW,
    });

    beforeEach(() => {
      reservationsRepo.findById = jest.fn().mockResolvedValue(CONFIRMED_ROW);
      reservationsRepo.checkin = jest
        .fn()
        .mockResolvedValue(makeRow({ status: "checked_in" }));
      partnersClient.getCheckinKey = jest.fn().mockResolvedValue("test-key-64");
    });

    it("validates key and returns mapped response", async () => {
      const result = await service.checkin(
        "res-uuid",
        "test-key-64",
        "booker-uuid",
      );

      expect(reservationsRepo.checkin).toHaveBeenCalledWith("res-uuid");
      expect(result).toEqual({ id: "res-uuid" });
    });

    it("throws ForbiddenException when bookerId does not match", async () => {
      await expect(
        service.checkin("res-uuid", "test-key-64", "wrong-booker"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws BadRequestException when reservation is not confirmed", async () => {
      reservationsRepo.findById = jest
        .fn()
        .mockResolvedValue(
          makeRow({ status: "held", check_in: TODAY, check_out: TOMORROW }),
        );

      await expect(
        service.checkin("res-uuid", "test-key-64", "booker-uuid"),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws UnauthorizedException when key does not match", async () => {
      await expect(
        service.checkin("res-uuid", "wrong-key", "booker-uuid"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws NotFoundException when no active key exists for the property", async () => {
      partnersClient.getCheckinKey = jest.fn().mockResolvedValue(null);

      await expect(
        service.checkin("res-uuid", "test-key-64", "booker-uuid"),
      ).rejects.toThrow(NotFoundException);
    });

    it("publishes booking.checked_in with actor=guest", async () => {
      await service.checkin("res-uuid", "test-key-64", "booker-uuid");

      expect(publisher.publish).toHaveBeenCalledWith(
        "booking.checked_in",
        expect.objectContaining({
          routingKey: "booking.checked_in",
          actor: "guest",
        }),
      );
    });
  });

  // ─── checkOut ───────────────────────────────────────────────────────────────

  describe("checkOut", () => {
    it("calls repo.checkOut and returns mapped response", async () => {
      const checkedOutRow = makeRow({ status: "checked_out" });
      reservationsRepo.checkOut = jest.fn().mockResolvedValue(checkedOutRow);

      const result = await service.checkOut("res-uuid");

      expect(reservationsRepo.checkOut).toHaveBeenCalledWith("res-uuid");
      expect(reservationsRepo.toResponse).toHaveBeenCalledWith(checkedOutRow);
      expect(result).toEqual({ id: checkedOutRow.id });
    });

    it("publishes booking.checked_out with actor=guest", async () => {
      const checkedOutRow = makeRow({ status: "checked_out" });
      reservationsRepo.checkOut = jest.fn().mockResolvedValue(checkedOutRow);

      await service.checkOut("res-uuid");

      expect(publisher.publish).toHaveBeenCalledWith(
        "booking.checked_out",
        expect.objectContaining({
          routingKey: "booking.checked_out",
          reservationId: checkedOutRow.id,
          actor: "guest",
          guestInfo: checkedOutRow.guest_info,
        }),
      );
    });
  });

  // ─── modify ─────────────────────────────────────────────────────────────────

  describe("modify", () => {
    const TODAY = "2026-04-15";

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T12:00:00Z`));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("rejects modifications on a submitted reservation", async () => {
      reservationsRepo.findById.mockResolvedValue(
        makeRow({ status: "submitted" }),
      );

      await expect(
        service.modify("res-uuid", { checkIn: "2026-05-02" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects partner modifications on non-confirmed reservations", async () => {
      reservationsRepo.findById.mockResolvedValue(makeRow({ status: "held" }));

      await expect(
        service.modify("res-uuid", { checkIn: "2026-05-02" }, "partner"),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects when checkOut is not after checkIn", async () => {
      reservationsRepo.findById.mockResolvedValue(
        makeRow({ status: "confirmed" }),
      );

      await expect(
        service.modify(
          "res-uuid",
          { checkIn: "2026-05-04", checkOut: "2026-05-04" },
          "partner",
        ),
      ).rejects.toThrow("checkOut must be after checkIn");
    });

    it("rejects past check-in dates", async () => {
      reservationsRepo.findById.mockResolvedValue(
        makeRow({ status: "confirmed" }),
      );

      await expect(
        service.modify(
          "res-uuid",
          { checkIn: "2026-04-10", checkOut: "2026-04-12" },
          "partner",
        ),
      ).rejects.toThrow("checkIn cannot be in the past");
    });

    it("only updates guest info when no dates are provided", async () => {
      reservationsRepo.findById.mockResolvedValue(
        makeRow({ status: "confirmed" }),
      );

      await service.modify(
        "res-uuid",
        { guestInfo: { firstName: "Bea", lastName: "X", email: "b@x.com" } },
        "partner",
      );

      expect(inventoryClient.hold).not.toHaveBeenCalled();
      expect(fareCalculator.calculate).not.toHaveBeenCalled();
      expect(reservationsRepo.modify).toHaveBeenCalledWith(
        "res-uuid",
        expect.objectContaining({
          checkIn: undefined,
          checkOut: undefined,
          guestInfo: expect.objectContaining({ firstName: "Bea" }),
          fareBreakdown: undefined,
        }),
      );
    });

    it("merges new guest info on top of the existing snapshot", async () => {
      reservationsRepo.findById.mockResolvedValue(
        makeRow({
          status: "confirmed",
          guest_info: {
            firstName: "Old",
            lastName: "Last",
            email: "old@x.com",
            phone: "+1",
          },
        }),
      );

      await service.modify(
        "res-uuid",
        {
          guestInfo: { firstName: "New", lastName: "Last", email: "old@x.com" },
        },
        "partner",
      );

      const args = reservationsRepo.modify.mock.calls[0][1];
      expect(args.guestInfo).toEqual({
        firstName: "New",
        lastName: "Last",
        email: "old@x.com",
        phone: "+1",
      });
    });

    it("for held reservations swaps the inventory hold and recalculates the fare", async () => {
      reservationsRepo.findById.mockResolvedValue(
        makeRow({
          status: "held",
          check_in: "2026-05-01",
          check_out: "2026-05-04",
        }),
      );

      await service.modify("res-uuid", {
        checkIn: "2026-05-10",
        checkOut: "2026-05-13",
      });

      expect(inventoryClient.hold).toHaveBeenCalledWith(
        "room-uuid",
        "2026-05-10",
        "2026-05-13",
      );
      expect(inventoryClient.unhold).toHaveBeenCalledWith(
        "room-uuid",
        "2026-05-01",
        "2026-05-04",
      );
      expect(inventoryClient.release).not.toHaveBeenCalled();
      expect(inventoryClient.confirmHold).not.toHaveBeenCalled();
      expect(fareCalculator.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: "prop-uuid",
          roomId: "room-uuid",
        }),
      );
      expect(reservationsRepo.modify).toHaveBeenCalledWith(
        "res-uuid",
        expect.objectContaining({
          checkIn: "2026-05-10",
          checkOut: "2026-05-13",
          fareBreakdown,
        }),
      );
    });

    it("for confirmed reservations releases old inventory and confirms the new range", async () => {
      reservationsRepo.findById.mockResolvedValue(
        makeRow({
          status: "confirmed",
          check_in: "2026-05-01",
          check_out: "2026-05-04",
        }),
      );

      await service.modify(
        "res-uuid",
        { checkIn: "2026-05-10", checkOut: "2026-05-13" },
        "partner",
      );

      expect(inventoryClient.hold).toHaveBeenCalledWith(
        "room-uuid",
        "2026-05-10",
        "2026-05-13",
      );
      expect(inventoryClient.release).toHaveBeenCalledWith(
        "room-uuid",
        "2026-05-01",
        "2026-05-04",
      );
      expect(inventoryClient.confirmHold).toHaveBeenCalledWith(
        "room-uuid",
        "2026-05-10",
        "2026-05-13",
      );
    });

    it("rolls back the new hold when releasing the old inventory fails", async () => {
      reservationsRepo.findById.mockResolvedValue(
        makeRow({
          status: "confirmed",
          check_in: "2026-05-01",
          check_out: "2026-05-04",
        }),
      );
      inventoryClient.release.mockRejectedValue(new Error("inventory down"));

      await expect(
        service.modify(
          "res-uuid",
          { checkIn: "2026-05-10", checkOut: "2026-05-13" },
          "partner",
        ),
      ).rejects.toThrow("inventory down");

      expect(inventoryClient.unhold).toHaveBeenCalledWith(
        "room-uuid",
        "2026-05-10",
        "2026-05-13",
      );
      expect(reservationsRepo.modify).not.toHaveBeenCalled();
    });

    it("does not touch inventory when only guest info is being updated", async () => {
      reservationsRepo.findById.mockResolvedValue(
        makeRow({ status: "confirmed" }),
      );

      await service.modify(
        "res-uuid",
        {
          checkIn: String(row.check_in),
          checkOut: String(row.check_out),
          guestInfo: { firstName: "Bea", lastName: "X", email: "b@x.com" },
        },
        "partner",
      );

      expect(inventoryClient.hold).not.toHaveBeenCalled();
      expect(fareCalculator.calculate).not.toHaveBeenCalled();
    });
  });

  // ─── refund quote ───────────────────────────────────────────────────────────

  describe("getRefundQuote", () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date("2026-05-10T12:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("returns full refund for a far-future confirmed reservation", async () => {
      reservationsRepo.findById.mockResolvedValue(
        makeRow({
          status: "confirmed",
          grand_total_usd: "1000.00",
          check_in: "2026-05-20",
        }),
      );

      const quote = await service.getRefundQuote("res-uuid");

      expect(quote).toEqual({
        policy: "full_refund",
        refundableUsd: 1000,
        daysUntilCheckIn: 10,
      });
    });

    it("treats a missing grand total as zero", async () => {
      reservationsRepo.findById.mockResolvedValue(
        makeRow({
          status: "confirmed",
          grand_total_usd: null,
          check_in: "2026-05-20",
        }),
      );

      const quote = await service.getRefundQuote("res-uuid");

      expect(quote.refundableUsd).toBe(0);
    });
  });
});
