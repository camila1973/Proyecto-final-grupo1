import { RefundsRepository } from "./refunds.repository.js";

function makeDb(opts: { many?: Record<string, unknown>[] } = {}) {
  const db: Record<string, jest.Mock> = {};
  const chain = [
    "selectFrom",
    "insertInto",
    "where",
    "selectAll",
    "orderBy",
    "values",
    "returningAll",
  ];
  chain.forEach((m) => {
    db[m] = jest.fn().mockReturnValue(db);
  });
  db.execute = jest.fn().mockResolvedValue(opts.many ?? []);
  return db as any;
}

function makeAdjustment(overrides: Record<string, unknown> = {}) {
  return {
    id: "adj-uuid",
    payment_id: "pay-uuid",
    kind: "refund",
    amount_usd: "100.00",
    external_ref: "re_test_xyz",
    reason: "guest_cancelled",
    status: "succeeded",
    failure_reason: null,
    actor_id: "user-7",
    actor_role: "guest",
    request_ip: "10.0.0.1",
    applied_at: new Date(),
    created_at: new Date(),
    ...overrides,
  };
}

describe("RefundsRepository", () => {
  describe("insert", () => {
    it("inserts into payment_adjustments and returns the row", async () => {
      const row = makeAdjustment();
      const db = makeDb({ many: [row] });
      const repo = new RefundsRepository(db);

      const result = await repo.insert(row as any);

      expect(db.insertInto).toHaveBeenCalledWith("payment_adjustments");
      expect(db.values).toHaveBeenCalledWith(row);
      expect(db.returningAll).toHaveBeenCalled();
      expect(result).toBe(row);
    });
  });

  describe("findByPaymentId", () => {
    it("queries by payment_id ordered by applied_at desc", async () => {
      const rows = [makeAdjustment(), makeAdjustment({ id: "adj-2" })];
      const db = makeDb({ many: rows });
      const repo = new RefundsRepository(db);

      const result = await repo.findByPaymentId("pay-uuid");

      expect(db.selectFrom).toHaveBeenCalledWith("payment_adjustments");
      expect(db.where).toHaveBeenCalledWith("payment_id", "=", "pay-uuid");
      expect(db.orderBy).toHaveBeenCalledWith("applied_at", "desc");
      expect(result).toBe(rows);
    });

    it("returns an empty list when no adjustments exist", async () => {
      const db = makeDb({ many: [] });
      const repo = new RefundsRepository(db);

      const result = await repo.findByPaymentId("missing");

      expect(result).toEqual([]);
    });
  });
});
