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

  describe("resolveDetailed", () => {
    it("reports source=partner when the rule's partner_id matches", async () => {
      const repo = makeRepo();
      repo.findApplicable.mockResolvedValue({
        id: "r-1",
        partner_id: "p-1",
        rate: "0.15",
        effective_from: "2020-01-01",
        effective_to: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } as any);

      const service = new CommissionRulesService(repo as any);
      const result = await service.resolveDetailed("p-1", "2026-03-15");

      expect(result).toEqual({
        partnerId: "p-1",
        ratePct: 15,
        source: "partner",
        effectiveFrom: "2020-01-01",
        effectiveTo: null,
      });
    });

    it("reports source=global when the rule's partner_id is null", async () => {
      const repo = makeRepo();
      repo.findApplicable.mockResolvedValue({
        id: "r-default",
        partner_id: null,
        rate: "0.20",
        effective_from: "2020-01-01",
        effective_to: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } as any);

      const service = new CommissionRulesService(repo as any);
      const result = await service.resolveDetailed("p-2", "2026-03-15");

      expect(result).toEqual({
        partnerId: "p-2",
        ratePct: 20,
        source: "global",
        effectiveFrom: "2020-01-01",
        effectiveTo: null,
      });
    });

    it("returns fallback (20%) with null dates when no rule matches", async () => {
      const repo = makeRepo();
      repo.findApplicable.mockResolvedValue(undefined);

      const service = new CommissionRulesService(repo as any);
      const result = await service.resolveDetailed("p-3", "2026-03-15");

      expect(result).toEqual({
        partnerId: "p-3",
        ratePct: 20,
        source: "fallback",
        effectiveFrom: null,
        effectiveTo: null,
      });
    });

    it("normalises Date objects from pg to YYYY-MM-DD strings", async () => {
      const repo = makeRepo();
      repo.findApplicable.mockResolvedValue({
        id: "r-2",
        partner_id: "p-1",
        rate: "0.10",
        effective_from: new Date("2020-01-01T00:00:00.000Z"),
        effective_to: new Date("2030-12-31T00:00:00.000Z"),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } as any);

      const service = new CommissionRulesService(repo as any);
      const result = await service.resolveDetailed("p-1", "2026-03-15");

      expect(result.effectiveFrom).toBe("2020-01-01");
      expect(result.effectiveTo).toBe("2030-12-31");
    });
  });
});
