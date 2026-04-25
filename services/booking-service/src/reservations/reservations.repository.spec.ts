import { NotFoundException } from "@nestjs/common";
import { ReservationsRepository } from "./reservations.repository.js";

// ─── Kysely builder mock ────────────────────────────────────────────────────

function makeDb(
  opts: {
    single?: Record<string, unknown> | null;
    many?: Record<string, unknown>[];
  } = {},
) {
  const db: Record<string, jest.Mock> = {};
  const chain = [
    "selectFrom",
    "insertInto",
    "updateTable",
    "set",
    "where",
    "select",
    "selectAll",
    "values",
    "returningAll",
  ];
  chain.forEach((m) => {
    db[m] = jest.fn().mockReturnValue(db);
  });
  db.execute = jest.fn().mockResolvedValue(opts.many ?? []);
  db.executeTakeFirst = jest.fn().mockResolvedValue(opts.single ?? undefined);
  db.executeTakeFirstOrThrow = jest.fn().mockResolvedValue(opts.single ?? {});
  return db as any;
}

// ─── Row factory ────────────────────────────────────────────────────────────

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
    fare_breakdown: { total: 522 },
    tax_total_usd: "72.00",
    fee_total_usd: "0.00",
    grand_total_usd: "522.00",
    hold_expires_at: null as Date | string | null,
    created_at: new Date("2026-04-07T10:00:00Z"),
    updated_at: new Date("2026-04-07T10:00:00Z"),
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("ReservationsRepository", () => {
  describe("insert", () => {
    it("calls insertInto and returns the created row", async () => {
      const row = makeRow();
      const db = makeDb({ single: row });
      const repo = new ReservationsRepository(db);

      const result = await repo.insert(row as any);

      expect(db.insertInto).toHaveBeenCalledWith("reservations");
      expect(result).toBe(row);
    });
  });

  describe("findAll", () => {
    it("returns all rows from the reservations table", async () => {
      const rows = [makeRow(), makeRow({ id: "res-2" })];
      const db = makeDb({ many: rows });
      const repo = new ReservationsRepository(db);

      const result = await repo.findAll();

      expect(db.selectFrom).toHaveBeenCalledWith("reservations");
      expect(result).toBe(rows);
    });
  });

  describe("findByBookerId", () => {
    it("filters reservations by booker_id", async () => {
      const rows = [makeRow()];
      const db = makeDb({ many: rows });
      const repo = new ReservationsRepository(db);

      const result = await repo.findByBookerId("booker-uuid");

      expect(db.selectFrom).toHaveBeenCalledWith("reservations");
      expect(db.where).toHaveBeenCalledWith("booker_id", "=", "booker-uuid");
      expect(result).toBe(rows);
    });
  });

  describe("findById", () => {
    it("returns the row when found", async () => {
      const row = makeRow();
      const db = makeDb({ single: row });
      const repo = new ReservationsRepository(db);

      const result = await repo.findById("res-uuid");

      expect(db.where).toHaveBeenCalledWith("id", "=", "res-uuid");
      expect(result).toBe(row);
    });

    it("throws NotFoundException when row is not found", async () => {
      const db = makeDb({ single: undefined });
      const repo = new ReservationsRepository(db);

      await expect(repo.findById("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── toResponse ─────────────────────────────────────────────────────────────

  describe("toResponse", () => {
    let repo: ReservationsRepository;

    beforeEach(() => {
      repo = new ReservationsRepository(null as any);
    });

    it("maps snake_case fields to camelCase", () => {
      const row = makeRow();
      const result = repo.toResponse(row as any);

      expect(result.id).toBe("res-uuid");
      expect(result.propertyId).toBe("prop-uuid");
      expect(result.roomId).toBe("room-uuid");
      expect(result.bookerId).toBe("booker-uuid");
      expect(result.guestInfo).toEqual({
        firstName: "Ana",
        lastName: "García",
        email: "ana@example.com",
      });
      expect(result.checkIn).toBe("2026-05-01");
      expect(result.checkOut).toBe("2026-05-04");
      expect(result.status).toBe("held");
    });

    it("parses numeric columns as floats", () => {
      const result = repo.toResponse(makeRow() as any);

      expect(result.taxTotalUsd).toBe(72);
      expect(result.feeTotalUsd).toBe(0);
      expect(result.grandTotalUsd).toBe(522);
    });

    it("returns null for null numeric columns", () => {
      const row = makeRow({
        tax_total_usd: null,
        fee_total_usd: null,
        grand_total_usd: null,
      });
      const result = repo.toResponse(row as any);

      expect(result.taxTotalUsd).toBeNull();
      expect(result.feeTotalUsd).toBeNull();
      expect(result.grandTotalUsd).toBeNull();
    });

    it("returns null for null holdExpiresAt", () => {
      const result = repo.toResponse(makeRow({ hold_expires_at: null }) as any);

      expect(result.holdExpiresAt).toBeNull();
    });

    it("converts Date holdExpiresAt to ISO string", () => {
      const date = new Date("2026-04-07T12:00:00.000Z");
      const result = repo.toResponse(makeRow({ hold_expires_at: date }) as any);

      expect(result.holdExpiresAt).toBe("2026-04-07T12:00:00.000Z");
    });

    it("converts string holdExpiresAt to string", () => {
      const result = repo.toResponse(
        makeRow({ hold_expires_at: "2026-04-07T12:00:00Z" }) as any,
      );

      expect(result.holdExpiresAt).toBe("2026-04-07T12:00:00Z");
    });

    it("converts Date createdAt to ISO string", () => {
      const result = repo.toResponse(
        makeRow({ created_at: new Date("2026-04-07T10:00:00.000Z") }) as any,
      );

      expect(result.createdAt).toBe("2026-04-07T10:00:00.000Z");
    });

    it("converts string createdAt to string", () => {
      const result = repo.toResponse(
        makeRow({ created_at: "2026-04-07T10:00:00Z" }) as any,
      );

      expect(result.createdAt).toBe("2026-04-07T10:00:00Z");
    });

    it("passes through fareBreakdown as-is", () => {
      const breakdown = { total: 999 };
      const result = repo.toResponse(
        makeRow({ fare_breakdown: breakdown }) as any,
      );

      expect(result.fareBreakdown).toBe(breakdown);
    });
  });

  describe("confirm", () => {
    it("updates status to confirmed and returns the row", async () => {
      const confirmed = makeRow({ status: "confirmed" });
      const db = makeDb({ single: confirmed });
      const repo = new ReservationsRepository(db);

      const result = await repo.confirm("res-uuid");
      expect(result).toEqual(confirmed);
    });

    it("guards against confirming non-submitted rows via status filter", async () => {
      const db = makeDb({ single: undefined });
      const repo = new ReservationsRepository(db);

      // A confirmed or expired row returns undefined from the guarded UPDATE,
      // which should throw NotFoundException
      await expect(repo.confirm("already-confirmed")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws NotFoundException when reservation not found", async () => {
      const db = makeDb({ single: null });
      const repo = new ReservationsRepository(db);

      await expect(repo.confirm("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("findExpiredHolds", () => {
    it("returns held rows with hold_expires_at in the past", async () => {
      const rows = [makeRow({ status: "held" })];
      const db = makeDb({ many: rows });
      const repo = new ReservationsRepository(db);

      const result = await repo.findExpiredHolds();

      expect(db.selectFrom).toHaveBeenCalledWith("reservations");
      expect(db.where).toHaveBeenCalledWith("status", "=", "held");
      expect(db.where).toHaveBeenCalledWith(
        "hold_expires_at",
        "<",
        expect.any(Date),
      );
      expect(result).toBe(rows);
    });
  });

  describe("findHoldByBookerAndStay", () => {
    it("returns the row when a matching held reservation exists", async () => {
      const row = makeRow();
      const db = makeDb({ single: row });
      const repo = new ReservationsRepository(db);

      const result = await repo.findHoldByBookerAndStay(
        "booker-uuid",
        "room-uuid",
        "2026-05-01",
        "2026-05-04",
      );

      expect(db.selectFrom).toHaveBeenCalledWith("reservations");
      expect(db.where).toHaveBeenCalledWith("booker_id", "=", "booker-uuid");
      expect(db.where).toHaveBeenCalledWith("room_id", "=", "room-uuid");
      expect(db.where).toHaveBeenCalledWith("check_in", "=", "2026-05-01");
      expect(db.where).toHaveBeenCalledWith("check_out", "=", "2026-05-04");
      expect(db.where).toHaveBeenCalledWith("status", "=", "held");
      expect(result).toBe(row);
    });

    it("returns null when no matching held reservation exists", async () => {
      const db = makeDb({ single: undefined });
      const repo = new ReservationsRepository(db);

      const result = await repo.findHoldByBookerAndStay(
        "booker-uuid",
        "room-uuid",
        "2026-05-01",
        "2026-05-04",
      );

      expect(result).toBeNull();
    });
  });

  describe("updateGuestInfo", () => {
    it("updates guest_info and returns the updated row", async () => {
      const updated = makeRow({
        guest_info: {
          firstName: "Ana",
          lastName: "García",
          email: "ana@example.com",
        },
      });
      const db = makeDb({ single: updated });
      const repo = new ReservationsRepository(db);

      const guestInfo = {
        firstName: "Ana",
        lastName: "García",
        email: "ana@example.com",
      };
      const result = await repo.updateGuestInfo("res-uuid", guestInfo);

      expect(db.updateTable).toHaveBeenCalledWith("reservations");
      expect(db.where).toHaveBeenCalledWith("id", "=", "res-uuid");
      expect(result).toBe(updated);
    });

    it("throws NotFoundException when reservation not found", async () => {
      const db = makeDb({ single: undefined });
      const repo = new ReservationsRepository(db);

      await expect(
        repo.updateGuestInfo("nonexistent", {
          firstName: "X",
          lastName: "Y",
          email: "x@y.com",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("submit", () => {
    it("transitions status from held to submitted and returns the updated row", async () => {
      const submitted = makeRow({ status: "submitted" });
      const db = makeDb({ single: submitted });
      const repo = new ReservationsRepository(db);

      const result = await repo.submit("res-uuid");

      expect(db.updateTable).toHaveBeenCalledWith("reservations");
      expect(db.where).toHaveBeenCalledWith("id", "=", "res-uuid");
      expect(db.where).toHaveBeenCalledWith("status", "=", "held");
      expect(result).toBe(submitted);
    });

    it("throws NotFoundException when reservation not found or not held", async () => {
      const db = makeDb({ single: undefined });
      const repo = new ReservationsRepository(db);

      await expect(repo.submit("res-uuid")).rejects.toThrow(NotFoundException);
    });
  });

  describe("expire", () => {
    it("transitions status to expired and returns the row", async () => {
      const expired = makeRow({ status: "expired" });
      const db = makeDb({ single: expired });
      const repo = new ReservationsRepository(db);

      const result = await repo.expire("res-uuid");

      expect(db.updateTable).toHaveBeenCalledWith("reservations");
      expect(db.where).toHaveBeenCalledWith("id", "=", "res-uuid");
      expect(db.where).toHaveBeenCalledWith("status", "=", "held");
      expect(result).toBe(expired);
    });

    it("returns undefined when row is not held (idempotency guard)", async () => {
      const db = makeDb({ single: undefined });
      const repo = new ReservationsRepository(db);

      const result = await repo.expire("already-confirmed");

      expect(result).toBeUndefined();
    });
  });
});
