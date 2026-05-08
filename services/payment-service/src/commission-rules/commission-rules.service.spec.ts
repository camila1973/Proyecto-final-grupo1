import { CommissionRulesService } from "./commission-rules.service.js";
import { CommissionRulesRepository } from "./commission-rules.repository.js";

function makeRepo(): jest.Mocked<
  Pick<CommissionRulesRepository, "findApplicable">
> {
  return { findApplicable: jest.fn() };
}

describe("CommissionRulesService", () => {
  it("returns the rule rate when a row is found", async () => {
    const repo = makeRepo();
    repo.findApplicable.mockResolvedValue({
      id: "r-1",
      partner_id: "p-1",
      rate: "0.25",
      effective_from: "2026-01-01",
      effective_to: null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);

    const service = new CommissionRulesService(repo as any);
    const rate = await service.resolveRate("p-1", "2026-03-15");

    expect(rate).toBe(0.25);
    expect(repo.findApplicable).toHaveBeenCalledWith("p-1", "2026-03-15");
  });

  it("falls back to 0.20 when no rule is found", async () => {
    const repo = makeRepo();
    repo.findApplicable.mockResolvedValue(undefined);

    const service = new CommissionRulesService(repo as any);
    const rate = await service.resolveRate("p-2", "2026-03-15");

    expect(rate).toBe(0.2);
  });
});
