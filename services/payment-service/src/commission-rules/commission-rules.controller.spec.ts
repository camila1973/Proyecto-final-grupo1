import { BadRequestException } from "@nestjs/common";
import { CommissionRulesController } from "./commission-rules.controller.js";

function makeService() {
  return { resolveDetailed: jest.fn() };
}

describe("CommissionRulesController", () => {
  it("delegates to service.resolveDetailed with the supplied date", async () => {
    const service = makeService();
    service.resolveDetailed.mockResolvedValue({
      partnerId: "p-1",
      ratePct: 20,
      source: "global",
      effectiveFrom: "2020-01-01",
      effectiveTo: null,
    });
    const controller = new CommissionRulesController(service as any);

    const result = await controller.resolve("p-1", "2026-05-09");

    expect(service.resolveDetailed).toHaveBeenCalledWith("p-1", "2026-05-09");
    expect(result).toEqual(
      expect.objectContaining({ partnerId: "p-1", ratePct: 20 }),
    );
  });

  it("defaults onDate to today (YYYY-MM-DD) when omitted", async () => {
    const service = makeService();
    service.resolveDetailed.mockResolvedValue({});
    const controller = new CommissionRulesController(service as any);

    await controller.resolve("p-1");

    const today = new Date().toISOString().slice(0, 10);
    expect(service.resolveDetailed).toHaveBeenCalledWith("p-1", today);
  });

  it("throws BadRequestException when partnerId is missing", () => {
    const controller = new CommissionRulesController(makeService() as any);
    expect(() => controller.resolve("" as any)).toThrow(BadRequestException);
    expect(() => controller.resolve(undefined as any)).toThrow(
      BadRequestException,
    );
  });

  it("throws BadRequestException when onDate is malformed", () => {
    const controller = new CommissionRulesController(makeService() as any);
    expect(() => controller.resolve("p-1", "yesterday")).toThrow(
      BadRequestException,
    );
    expect(() => controller.resolve("p-1", "2026/05/09")).toThrow(
      BadRequestException,
    );
  });
});
