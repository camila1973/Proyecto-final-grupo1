import { NotFoundException } from "@nestjs/common";
import { PartnerFeesRepository } from "./partner-fees.repository.js";

// ─── Kysely builder mock ────────────────────────────────────────────────────

function makeDb(
  rows: Record<string, unknown>[] = [],
  firstRow?: Record<string, unknown> | null,
) {
  const db: Record<string, jest.Mock> = {};
  const chain = [
    "selectFrom",
    "where",
    "select",
    "selectAll",
    "insertInto",
    "values",
    "returningAll",
    "updateTable",
    "set",
  ];
  chain.forEach((m) => {
    db[m] = jest.fn().mockReturnValue(db);
  });
  db.execute = jest.fn().mockResolvedValue(rows);
  db.executeTakeFirst = jest
    .fn()
    .mockResolvedValue(firstRow ?? rows[0] ?? undefined);
  db.executeTakeFirstOrThrow = jest
    .fn()
    .mockResolvedValue(firstRow ?? rows[0] ?? undefined);
  // onConflict takes a builder callback — invoke it with a chainable mock
  const conflictBuilder = {
    column: jest.fn().mockReturnThis(),
    doUpdateSet: jest.fn().mockReturnThis(),
  };
  db.onConflict = jest
    .fn()
    .mockImplementation((cb: (b: typeof conflictBuilder) => unknown) => {
      cb(conflictBuilder);
      return db;
    });
  return db as any;
}

function makeFeeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "fee-1",
    partner_id: "partner-1",
    property_id: null as string | null,
    fee_name: "Resort Fee",
    fee_type: "FLAT_PER_NIGHT",
    rate: null,
    flat_amount: "25.00",
    currency: "USD",
    effective_from: "2026-01-01",
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("PartnerFeesRepository", () => {
  describe("findApplicable", () => {
    const checkIn = new Date("2026-05-01");
    const checkOut = new Date("2026-05-04");

    it("returns empty array when no fees exist", async () => {
      const db = makeDb([]);
      const repo = new PartnerFeesRepository(db);

      const result = await repo.findApplicable(
        "partner-1",
        "prop-1",
        checkIn,
        checkOut,
      );

      expect(result).toHaveLength(0);
    });

    it("returns applicable fees for the partner", async () => {
      const fee = makeFeeRow();
      const db = makeDb([fee]);
      const repo = new PartnerFeesRepository(db);

      const result = await repo.findApplicable(
        "partner-1",
        "prop-1",
        checkIn,
        checkOut,
      );

      expect(result).toHaveLength(1);
      expect(result[0].fee_name).toBe("Resort Fee");
    });

    it("returns multiple fees", async () => {
      const fee1 = makeFeeRow();
      const fee2 = makeFeeRow({
        id: "fee-2",
        fee_name: "Cleaning Fee",
        fee_type: "FLAT_PER_STAY",
      });
      const db = makeDb([fee1, fee2]);
      const repo = new PartnerFeesRepository(db);

      const result = await repo.findApplicable(
        "partner-1",
        "prop-1",
        checkIn,
        checkOut,
      );

      expect(result).toHaveLength(2);
    });

    it("queries by partner_id", async () => {
      const db = makeDb([]);
      const repo = new PartnerFeesRepository(db);

      await repo.findApplicable("partner-1", "prop-1", checkIn, checkOut);

      expect(db.where).toHaveBeenCalledWith("partner_id", "=", "partner-1");
    });
  });

  describe("upsert — insert path (no id)", () => {
    it("inserts and returns the new row", async () => {
      const fee = makeFeeRow();
      const db = makeDb([], fee);
      const repo = new PartnerFeesRepository(db);

      const result = await repo.upsert({
        partner_id: "partner-1",
        property_id: null,
        fee_name: "Resort Fee",
        fee_type: "FLAT_PER_NIGHT",
        rate: null,
        flat_amount: 25,
        currency: "USD",
        effective_from: "2026-01-01",
        effective_to: null,
      } as any);

      expect(db.insertInto).toHaveBeenCalledWith("partner_fees");
      expect(result).toEqual(fee);
    });
  });

  describe("upsert — update path (with id)", () => {
    it("updates and returns the row when found", async () => {
      const fee = makeFeeRow();
      const db = makeDb([], fee);
      const repo = new PartnerFeesRepository(db);

      const result = await repo.upsert({ ...fee, fee_name: "Updated" });
      expect(db.updateTable).toHaveBeenCalledWith("partner_fees");
      expect(result).toEqual(fee);
    });

    it("throws NotFoundException when update finds no row", async () => {
      const db = makeDb([], null);
      const repo = new PartnerFeesRepository(db);

      await expect(
        repo.upsert({
          id: "missing",
          partner_id: "p1",
          fee_name: "X",
          fee_type: "FLAT_PER_STAY",
          currency: "USD",
          effective_from: "2026-01-01",
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findById", () => {
    it("returns the row when found", async () => {
      const fee = makeFeeRow();
      const db = makeDb([], fee);
      const repo = new PartnerFeesRepository(db);

      const result = await repo.findById("fee-1");
      expect(result).toEqual(fee);
    });
  });

  describe("findAll", () => {
    it("returns fees for the partner", async () => {
      const fees = [makeFeeRow(), makeFeeRow({ id: "fee-2" })];
      const db = makeDb(fees);
      const repo = new PartnerFeesRepository(db);

      const result = await repo.findAll("partner-1");
      expect(result).toHaveLength(2);
    });
  });

  describe("softDelete", () => {
    it("sets is_active=false", async () => {
      const db = makeDb();
      const repo = new PartnerFeesRepository(db);

      await repo.softDelete("fee-1");
      expect(db.updateTable).toHaveBeenCalledWith("partner_fees");
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });
  });

  describe("upsertFromEvent", () => {
    it("executes insert with on-conflict upsert", async () => {
      const db = makeDb();
      const repo = new PartnerFeesRepository(db);

      await repo.upsertFromEvent({
        feeId: "fee-1",
        partnerId: "partner-1",
        propertyId: "prop-1",
        feeName: "Resort Fee",
        feeType: "FLAT_PER_NIGHT",
        flatAmount: 25,
        currency: "USD",
        effectiveFrom: "2026-01-01",
      });

      expect(db.insertInto).toHaveBeenCalledWith("partner_fees");
      expect(db.onConflict).toHaveBeenCalled();
    });

    it("handles optional fields defaulting to null", async () => {
      const db = makeDb();
      const repo = new PartnerFeesRepository(db);

      await expect(
        repo.upsertFromEvent({
          feeId: "fee-2",
          partnerId: "partner-2",
          feeName: "Svc",
          feeType: "PERCENTAGE",
          rate: 5,
          currency: "USD",
          effectiveFrom: "2026-01-01",
        }),
      ).resolves.not.toThrow();
    });
  });
});
