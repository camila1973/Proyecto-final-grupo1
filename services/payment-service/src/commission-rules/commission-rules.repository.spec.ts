import { CommissionRulesRepository } from "./commission-rules.repository.js";

function makeChain(takeFirstResults: Array<unknown>) {
  const queue = [...takeFirstResults];
  const chain: Record<string, jest.Mock> = {};
  ["selectFrom", "selectAll", "where", "orderBy"].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.executeTakeFirst = jest.fn().mockImplementation(() => {
    return Promise.resolve(queue.shift());
  });
  return chain as any;
}

const ROW = {
  id: "r-1",
  partner_id: "p-1",
  rate: "0.20",
  effective_from: "2024-01-01",
  effective_to: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe("CommissionRulesRepository.findApplicable", () => {
  it("returns the partner-specific rule when present", async () => {
    const chain = makeChain([ROW]);
    const repo = new CommissionRulesRepository(chain);

    const result = await repo.findApplicable("p-1", "2026-03-15");

    expect(result).toBe(ROW);
    expect(chain.selectFrom).toHaveBeenCalledWith("commission_rules");
    // partner-specific query short-circuits — only one executeTakeFirst call
    expect(chain.executeTakeFirst).toHaveBeenCalledTimes(1);
    expect(chain.where).toHaveBeenCalledWith("partner_id", "=", "p-1");
  });

  it("falls back to the global default when no partner-specific rule exists", async () => {
    const globalRow = { ...ROW, partner_id: null };
    const chain = makeChain([undefined, globalRow]);
    const repo = new CommissionRulesRepository(chain);

    const result = await repo.findApplicable("p-2", "2026-03-15");

    expect(result).toBe(globalRow);
    expect(chain.executeTakeFirst).toHaveBeenCalledTimes(2);
    expect(chain.where).toHaveBeenCalledWith("partner_id", "is", null);
  });

  it("returns undefined when neither partner nor global rule matches", async () => {
    const chain = makeChain([undefined, undefined]);
    const repo = new CommissionRulesRepository(chain);

    const result = await repo.findApplicable("p-3", "2026-03-15");

    expect(result).toBeUndefined();
  });
});
