import { PaymentsRepository } from "./payments.repository.js";

// ─── Kysely chain mock ────────────────────────────────────────────────────────

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
    "selectAll",
    "values",
    "returningAll",
  ];
  chain.forEach((m) => {
    db[m] = jest.fn().mockReturnValue(db);
  });
  db.execute = jest.fn().mockResolvedValue(opts.many ?? []);
  db.executeTakeFirst = jest.fn().mockResolvedValue(opts.single ?? undefined);
  return db as any;
}

// ─── Row factory ─────────────────────────────────────────────────────────────

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "pay-uuid",
    reservation_id: "res-uuid",
    stripe_payment_intent_id: "pi_test_abc",
    stripe_payment_method_id: null as string | null,
    amount_usd: "350.50",
    currency: "usd",
    status: "pending",
    failure_reason: null as string | null,
    guest_email: "guest@example.com",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("PaymentsRepository", () => {
  // ─── create ───────────────────────────────────────────────────────────────

  describe("create", () => {
    it("inserts into payments table and returns the created row", async () => {
      const row = makeRow();
      // create uses .execute() which returns an array; destructure gives first element
      const db = makeDb({ many: [row] });
      const repo = new PaymentsRepository(db);

      const result = await repo.create(row as any);

      expect(db.insertInto).toHaveBeenCalledWith("payments");
      expect(db.values).toHaveBeenCalledWith(row);
      expect(db.returningAll).toHaveBeenCalled();
      expect(result).toBe(row);
    });
  });

  // ─── findByReservationId ──────────────────────────────────────────────────

  describe("findByReservationId", () => {
    it("queries by reservation_id and returns the matching row", async () => {
      const row = makeRow();
      const db = makeDb({ single: row });
      const repo = new PaymentsRepository(db);

      const result = await repo.findByReservationId("res-uuid");

      expect(db.selectFrom).toHaveBeenCalledWith("payments");
      expect(db.where).toHaveBeenCalledWith("reservation_id", "=", "res-uuid");
      expect(result).toBe(row);
    });

    it("returns undefined when no row matches", async () => {
      const db = makeDb({ single: null });
      const repo = new PaymentsRepository(db);

      const result = await repo.findByReservationId("unknown");

      expect(result).toBeUndefined();
    });
  });

  // ─── findByIntentId ───────────────────────────────────────────────────────

  describe("findByIntentId", () => {
    it("queries by stripe_payment_intent_id and returns the matching row", async () => {
      const row = makeRow({ stripe_payment_intent_id: "pi_test_abc" });
      const db = makeDb({ single: row });
      const repo = new PaymentsRepository(db);

      const result = await repo.findByIntentId("pi_test_abc");

      expect(db.where).toHaveBeenCalledWith(
        "stripe_payment_intent_id",
        "=",
        "pi_test_abc",
      );
      expect(result).toBe(row);
    });
  });

  // ─── updateByIntentId ─────────────────────────────────────────────────────

  describe("updateByIntentId", () => {
    it("updates payment record by stripe_payment_intent_id", async () => {
      const db = makeDb();
      const repo = new PaymentsRepository(db);

      await repo.updateByIntentId("pi_test_abc", {
        status: "captured",
        stripe_payment_method_id: "pm_token_xyz",
      });

      expect(db.updateTable).toHaveBeenCalledWith("payments");
      expect(db.set).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "captured",
          stripe_payment_method_id: "pm_token_xyz",
        }),
      );
      expect(db.where).toHaveBeenCalledWith(
        "stripe_payment_intent_id",
        "=",
        "pi_test_abc",
      );
      expect(db.execute).toHaveBeenCalled();
    });

    it("includes updated_at timestamp in the update", async () => {
      const db = makeDb();
      const repo = new PaymentsRepository(db);
      const before = new Date();

      await repo.updateByIntentId("pi_test_abc", { status: "failed" });

      const setArg = db.set.mock.calls[0][0];
      expect(setArg.updated_at).toBeInstanceOf(Date);
      expect(setArg.updated_at.getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 10,
      );
    });
  });
});
