import { TaxRulesService } from "./tax-rules.service.js";

function makeRepo() {
  return {
    insert: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
}

function makePublisher() {
  return { publish: jest.fn() };
}

const ROW = {
  id: "rule-1",
  country: "MX",
  city: "cancún",
  tax_name: "IVA",
  tax_type: "PERCENTAGE",
  rate: "16.00",
  flat_amount: null,
  currency: "USD",
  effective_from: "2026-01-01",
  effective_to: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe("TaxRulesService", () => {
  describe("create", () => {
    it("inserts and publishes upserted event", async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      repo.insert.mockResolvedValue(ROW);

      const svc = new TaxRulesService(repo as any, publisher as any);
      const result = await svc.create({
        country: "MX",
        taxName: "IVA",
        taxType: "PERCENTAGE",
        rate: 16,
        effectiveFrom: "2026-01-01",
      });

      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ country: "MX", tax_name: "IVA" }),
      );
      expect(publisher.publish).toHaveBeenCalledWith(
        "tax.rule.upserted",
        expect.objectContaining({ ruleId: "rule-1", country: "MX" }),
      );
      expect(result).toBe(ROW);
    });

    it("uses null for optional fields when omitted", async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      repo.insert.mockResolvedValue(ROW);
      const svc = new TaxRulesService(repo as any, publisher as any);

      await svc.create({
        country: "MX",
        taxName: "IVA",
        taxType: "PERCENTAGE",
        effectiveFrom: "2026-01-01",
      });

      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          city: null,
          rate: null,
          flat_amount: null,
          currency: "USD",
        }),
      );
    });
  });

  describe("findAll", () => {
    it("delegates to repo with optional country filter", async () => {
      const repo = makeRepo();
      repo.findAll.mockResolvedValue([ROW]);
      const svc = new TaxRulesService(repo as any, makePublisher() as any);

      const result = await svc.findAll("MX");
      expect(repo.findAll).toHaveBeenCalledWith("MX");
      expect(result).toEqual([ROW]);
    });

    it("works without country filter", async () => {
      const repo = makeRepo();
      repo.findAll.mockResolvedValue([]);
      const svc = new TaxRulesService(repo as any, makePublisher() as any);

      await svc.findAll();
      expect(repo.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe("findOne", () => {
    it("delegates to repo.findById", async () => {
      const repo = makeRepo();
      repo.findById.mockResolvedValue(ROW);
      const svc = new TaxRulesService(repo as any, makePublisher() as any);

      const result = await svc.findOne("rule-1");
      expect(repo.findById).toHaveBeenCalledWith("rule-1");
      expect(result).toBe(ROW);
    });
  });

  describe("update", () => {
    it("updates and publishes upserted event", async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      const updated = { ...ROW, tax_name: "IVA updated" };
      repo.update.mockResolvedValue(updated);

      const svc = new TaxRulesService(repo as any, publisher as any);
      const result = await svc.update("rule-1", { taxName: "IVA updated" });

      expect(repo.update).toHaveBeenCalledWith("rule-1", {
        tax_name: "IVA updated",
      });
      expect(publisher.publish).toHaveBeenCalledWith(
        "tax.rule.upserted",
        expect.objectContaining({ ruleId: "rule-1" }),
      );
      expect(result).toBe(updated);
    });

    it("includes flat_amount in event when present", async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      const rowWithFlat = { ...ROW, rate: null, flat_amount: "5.00" };
      repo.update.mockResolvedValue(rowWithFlat);

      const svc = new TaxRulesService(repo as any, publisher as any);
      await svc.update("rule-1", { flatAmount: 5 });

      expect(publisher.publish).toHaveBeenCalledWith(
        "tax.rule.upserted",
        expect.objectContaining({ flatAmount: 5 }),
      );
    });
  });

  describe("remove", () => {
    it("soft-deletes and publishes deleted event", async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      repo.findById.mockResolvedValue(ROW);
      repo.softDelete.mockResolvedValue(undefined);

      const svc = new TaxRulesService(repo as any, publisher as any);
      await svc.remove("rule-1");

      expect(repo.softDelete).toHaveBeenCalledWith("rule-1");
      expect(publisher.publish).toHaveBeenCalledWith(
        "tax.rule.deleted",
        expect.objectContaining({ ruleId: "rule-1", country: "MX" }),
      );
    });
  });
});
