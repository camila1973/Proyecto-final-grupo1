import { CreateFeeDto } from "./dto/create-fee.dto.js";
import { UpdateFeeDto } from "./dto/update-fee.dto.js";
import { FeesController } from "./fees.controller.js";

function makeService() {
  return {
    create: jest.fn<Promise<Record<string, unknown>>, [CreateFeeDto]>(),
    findAll: jest.fn<Promise<Record<string, unknown>[]>, [string]>(),
    update: jest.fn<
      Promise<Record<string, unknown>>,
      [string, string, UpdateFeeDto]
    >(),
    remove: jest.fn<Promise<void>, [string]>(),
  };
}

const FEE: Record<string, unknown> = { id: "fee-1", feeName: "Resort Fee" };

describe("FeesController", () => {
  it("create delegates to service.create", async () => {
    const svc = makeService();
    svc.create.mockResolvedValue(FEE);
    const ctrl = new FeesController(svc as any);

    const dto: CreateFeeDto = {
      partnerId: "p1",
      feeName: "Resort Fee",
      feeType: "FLAT_PER_NIGHT",
      effectiveFrom: "2026-01-01",
    };
    const result: Record<string, unknown> = await ctrl.create(dto);
    expect(result).toBe(FEE);
    expect(svc.create).toHaveBeenCalledWith(dto);
  });

  it("findAll delegates with partnerId", async () => {
    const svc = makeService();
    svc.findAll.mockResolvedValue([FEE]);
    const ctrl = new FeesController(svc as any);

    const result = await ctrl.findAll("p1");
    expect(result).toEqual([FEE]);
    expect(svc.findAll).toHaveBeenCalledWith("p1");
  });

  it("update delegates with id and dto", async () => {
    const svc = makeService();
    svc.update.mockResolvedValue(FEE);
    const ctrl = new FeesController(svc as any);

    const dto: UpdateFeeDto & { partnerId: string } = {
      partnerId: "p1",
      feeName: "Updated",
    };
    const result: Record<string, unknown> = await ctrl.update("fee-1", dto);
    expect(result).toBe(FEE);
    expect(svc.update).toHaveBeenCalledWith("fee-1", "p1", dto);
  });

  it("remove delegates with id", async () => {
    const svc = makeService();
    svc.remove.mockResolvedValue(undefined);
    const ctrl = new FeesController(svc as any);

    await ctrl.remove("fee-1");
    expect(svc.remove).toHaveBeenCalledWith("fee-1");
  });
});
