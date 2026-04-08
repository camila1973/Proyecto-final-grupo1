import { PartnerFeesRepository } from "./partner-fees.repository.js";

// ─── Kysely builder mock ────────────────────────────────────────────────────

function makeDb(rows: Record<string, unknown>[] = []) {
  const db: Record<string, jest.Mock> = {};
  const chain = ["selectFrom", "where", "select"];
  chain.forEach((m) => {
    db[m] = jest.fn().mockReturnValue(db);
  });
  db.execute = jest.fn().mockResolvedValue(rows);
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
});
