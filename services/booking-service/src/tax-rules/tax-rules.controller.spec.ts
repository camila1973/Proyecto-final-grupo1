import { TaxRulesController } from "./tax-rules.controller.js";

function makeService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
}

const RULE = { id: "rule-1", country: "MX", tax_name: "IVA" };

describe("TaxRulesController", () => {
  it("create delegates to service.create", async () => {
    const svc = makeService();
    svc.create.mockResolvedValue(RULE);
    const ctrl = new TaxRulesController(svc as any);
    const dto = {
      country: "MX",
      taxName: "IVA",
      taxType: "PERCENTAGE",
      effectiveFrom: "2026-01-01",
    } as any;
    expect(await ctrl.create(dto)).toBe(RULE);
    expect(svc.create).toHaveBeenCalledWith(dto);
  });

  it("findAll passes country query param", async () => {
    const svc = makeService();
    svc.findAll.mockResolvedValue([RULE]);
    const ctrl = new TaxRulesController(svc as any);
    expect(await ctrl.findAll("MX")).toEqual([RULE]);
    expect(svc.findAll).toHaveBeenCalledWith("MX");
  });

  it("findAll works without country", async () => {
    const svc = makeService();
    svc.findAll.mockResolvedValue([]);
    const ctrl = new TaxRulesController(svc as any);
    await ctrl.findAll();
    expect(svc.findAll).toHaveBeenCalledWith(undefined);
  });

  it("findOne delegates with id", async () => {
    const svc = makeService();
    svc.findOne.mockResolvedValue(RULE);
    const ctrl = new TaxRulesController(svc as any);
    expect(await ctrl.findOne("rule-1")).toBe(RULE);
  });

  it("update delegates with id and dto", async () => {
    const svc = makeService();
    svc.update.mockResolvedValue(RULE);
    const ctrl = new TaxRulesController(svc as any);
    const dto = { taxName: "IVA2" } as any;
    expect(await ctrl.update("rule-1", dto)).toBe(RULE);
    expect(svc.update).toHaveBeenCalledWith("rule-1", dto);
  });

  it("remove delegates with id", async () => {
    const svc = makeService();
    svc.remove.mockResolvedValue(undefined);
    const ctrl = new TaxRulesController(svc as any);
    await ctrl.remove("rule-1");
    expect(svc.remove).toHaveBeenCalledWith("rule-1");
  });
});
