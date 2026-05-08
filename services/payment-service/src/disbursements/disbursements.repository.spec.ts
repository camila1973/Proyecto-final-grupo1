import { DisbursementsRepository } from "./disbursements.repository.js";

function makeChain(
  opts: {
    takeFirst?: Array<unknown>;
    many?: Array<unknown>;
  } = {},
) {
  const queue = [...(opts.takeFirst ?? [])];
  const chain: Record<string, jest.Mock> = {};
  [
    "selectFrom",
    "select",
    "selectAll",
    "where",
    "orderBy",
    "insertInto",
    "values",
    "onConflict",
    "columns",
    "doNothing",
    "deleteFrom",
    "updateTable",
    "set",
  ].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  // onConflict takes a callback that receives a builder with .columns().doNothing()
  chain.onConflict = jest.fn().mockImplementation((cb: (b: any) => any) => {
    cb(chain);
    return chain;
  });
  chain.execute = jest.fn().mockResolvedValue(opts.many ?? []);
  chain.executeTakeFirst = jest
    .fn()
    .mockImplementation(() => Promise.resolve(queue.shift()));
  return chain as any;
}

const HEADER = {
  id: "disb-1",
  partner_id: "p-1",
  period_start: "2026-03-01",
  period_end: "2026-04-01",
  scheduled_for: "2026-04-01",
  currency: "USD",
  gross_total_usd: "0",
  tax_total_usd: "0",
  partner_fee_total_usd: "0",
  commission_total_usd: "0",
  net_total_usd: "0",
  status: "pending",
  paid_at: null,
  failure_reason: null,
  external_transfer_ref: null,
  created_at: new Date(),
  updated_at: new Date(),
};

describe("DisbursementsRepository", () => {
  describe("findByPeriod", () => {
    it("queries disbursements by partner + period", async () => {
      const db = makeChain({ takeFirst: [HEADER] });
      const repo = new DisbursementsRepository(db);

      const row = await repo.findByPeriod("p-1", "2026-03-01", "2026-04-01");

      expect(db.selectFrom).toHaveBeenCalledWith("disbursements");
      expect(db.where).toHaveBeenCalledWith("partner_id", "=", "p-1");
      expect(db.where).toHaveBeenCalledWith("period_start", "=", "2026-03-01");
      expect(db.where).toHaveBeenCalledWith("period_end", "=", "2026-04-01");
      expect(row).toBe(HEADER);
    });
  });

  describe("findCapturedInPeriod", () => {
    it("returns the captured payment rows", async () => {
      const captured = [
        {
          payment_id: "pay-1",
          property_id: "prop-1",
          property_name: "Hotel A",
          gross_amount_usd: "100",
          tax_amount_usd: "19",
          partner_fee_usd: "5",
          commission_amount_usd: "20",
          net_payout_usd: "80",
        },
      ];
      const db = makeChain({ many: captured });
      const repo = new DisbursementsRepository(db);

      const rows = await repo.findCapturedInPeriod(
        "p-1",
        "2026-03-01",
        "2026-04-01",
      );

      expect(db.selectFrom).toHaveBeenCalledWith("payments");
      expect(db.where).toHaveBeenCalledWith("partner_id", "=", "p-1");
      expect(db.where).toHaveBeenCalledWith("status", "=", "captured");
      expect(rows).toBe(captured);
    });
  });

  describe("upsertHeader", () => {
    it("inserts ON CONFLICT DO NOTHING and returns the (re-read) row", async () => {
      // 1st executeTakeFirst is the post-insert findByPeriod
      const db = makeChain({ takeFirst: [HEADER] });
      const repo = new DisbursementsRepository(db);

      const result = await repo.upsertHeader({
        partnerId: "p-1",
        periodStart: "2026-03-01",
        periodEnd: "2026-04-01",
        scheduledFor: "2026-04-01",
      });

      expect(db.insertInto).toHaveBeenCalledWith("disbursements");
      expect(db.values).toHaveBeenCalledWith(
        expect.objectContaining({
          partner_id: "p-1",
          period_start: "2026-03-01",
          period_end: "2026-04-01",
          scheduled_for: "2026-04-01",
        }),
      );
      expect(db.doNothing).toHaveBeenCalled();
      expect(result).toBe(HEADER);
    });

    it("throws when re-read returns no row", async () => {
      const db = makeChain({ takeFirst: [undefined] });
      const repo = new DisbursementsRepository(db);

      await expect(
        repo.upsertHeader({
          partnerId: "p-1",
          periodStart: "2026-03-01",
          periodEnd: "2026-04-01",
          scheduledFor: "2026-04-01",
        }),
      ).rejects.toThrow(/Failed to upsert disbursement/);
    });
  });

  describe("writeItemsAndTotals", () => {
    it("runs deletes + inserts + update inside a transaction", async () => {
      const trx = makeChain();
      const db = {
        transaction: () => ({
          execute: (fn: (t: typeof trx) => Promise<void>) => fn(trx),
        }),
      } as any;
      const repo = new DisbursementsRepository(db);

      await repo.writeItemsAndTotals(
        "disb-1",
        [
          {
            disbursement_id: "disb-1",
            payment_id: "pay-1",
            property_id: "prop-1",
            property_name: "Hotel A",
            gross_amount_usd: "100",
            tax_amount_usd: "19",
            partner_fee_usd: "5",
            commission_amount_usd: "20",
            net_payout_usd: "80",
          } as any,
        ],
        {
          grossTotal: 100,
          taxTotal: 19,
          partnerFeeTotal: 5,
          commissionTotal: 20,
          netTotal: 80,
        },
      );

      expect(trx.deleteFrom).toHaveBeenCalledWith("disbursement_items");
      expect(trx.insertInto).toHaveBeenCalledWith("disbursement_items");
      expect(trx.updateTable).toHaveBeenCalledWith("disbursements");
      expect(trx.set).toHaveBeenCalledWith(
        expect.objectContaining({
          gross_total_usd: "100",
          net_total_usd: "80",
        }),
      );
    });

    it("skips the insert when items is empty", async () => {
      const trx = makeChain();
      const db = {
        transaction: () => ({
          execute: (fn: (t: typeof trx) => Promise<void>) => fn(trx),
        }),
      } as any;
      const repo = new DisbursementsRepository(db);

      await repo.writeItemsAndTotals("disb-1", [], {
        grossTotal: 0,
        taxTotal: 0,
        partnerFeeTotal: 0,
        commissionTotal: 0,
        netTotal: 0,
      });

      expect(trx.insertInto).not.toHaveBeenCalledWith("disbursement_items");
      expect(trx.deleteFrom).toHaveBeenCalledWith("disbursement_items");
      expect(trx.updateTable).toHaveBeenCalledWith("disbursements");
    });
  });
});
