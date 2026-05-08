import { BadRequestException } from "@nestjs/common";
import { DisbursementsController } from "./disbursements.controller.js";

function makeService() {
  return {
    getByPartnerAndMonth: jest.fn().mockResolvedValue({
      status: "projected",
      totals: { gross: 0, tax: 0, partnerFee: 0, commission: 0, net: 0 },
      byProperty: [],
      paymentCount: 0,
    }),
  };
}

describe("DisbursementsController", () => {
  it("delegates to the service when month is YYYY-MM", async () => {
    const service = makeService();
    const controller = new DisbursementsController(service as any);

    await controller.byPartner("partner-1", "2026-03");

    expect(service.getByPartnerAndMonth).toHaveBeenCalledWith(
      "partner-1",
      "2026-03",
    );
  });

  it("rejects malformed month", () => {
    const service = makeService();
    const controller = new DisbursementsController(service as any);

    expect(() => controller.byPartner("p-1", "march")).toThrow(
      BadRequestException,
    );
  });

  it("rejects missing month", () => {
    const service = makeService();
    const controller = new DisbursementsController(service as any);

    expect(() =>
      controller.byPartner("p-1", undefined as unknown as string),
    ).toThrow(BadRequestException);
  });
});
