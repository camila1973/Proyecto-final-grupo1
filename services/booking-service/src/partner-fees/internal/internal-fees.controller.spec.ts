import { InternalFeesController } from "./internal-fees.controller.js";

function makeService() {
  return {
    upsert: jest.fn(),
    findAll: jest.fn(),
    softDelete: jest.fn(),
  };
}

const ROW = { id: "fee-1", partner_id: "partner-1", fee_name: "Resort Fee" };

describe("InternalFeesController", () => {
  it("upsert maps dto fields and delegates to service", async () => {
    const svc = makeService();
    svc.upsert.mockResolvedValue(ROW);
    const ctrl = new InternalFeesController(svc as any);

    const dto = {
      partnerId: "partner-1",
      propertyId: "prop-1",
      feeName: "Resort Fee",
      feeType: "FLAT_PER_NIGHT" as const,
      flatAmount: 25,
      currency: "USD",
      effectiveFrom: "2026-01-01",
    } as any;

    const result = await ctrl.upsert(dto);
    expect(result).toBe(ROW);
    expect(svc.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        partner_id: "partner-1",
        property_id: "prop-1",
        fee_name: "Resort Fee",
        flat_amount: 25,
      }),
    );
  });

  it("upsert uses defaults for optional fields", async () => {
    const svc = makeService();
    svc.upsert.mockResolvedValue(ROW);
    const ctrl = new InternalFeesController(svc as any);

    await ctrl.upsert({
      partnerId: "p1",
      feeName: "Fee",
      feeType: "FLAT_PER_STAY" as const,
      effectiveFrom: "2026-01-01",
    } as any);

    expect(svc.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        property_id: null,
        rate: null,
        flat_amount: null,
        currency: "USD",
        effective_to: null,
      }),
    );
  });

  it("findAll delegates with partnerId", async () => {
    const svc = makeService();
    svc.findAll.mockResolvedValue([ROW]);
    const ctrl = new InternalFeesController(svc as any);
    const result = await ctrl.findAll("partner-1");
    expect(svc.findAll).toHaveBeenCalledWith("partner-1");
    expect(result).toEqual([ROW]);
  });

  it("remove delegates with id", async () => {
    const svc = makeService();
    svc.softDelete.mockResolvedValue(undefined);
    const ctrl = new InternalFeesController(svc as any);
    await ctrl.remove("fee-1");
    expect(svc.softDelete).toHaveBeenCalledWith("fee-1");
  });
});
