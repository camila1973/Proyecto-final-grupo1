import { FeesService } from "./fees.service.js";

function makeClient() {
  return {
    upsertFee: jest.fn<Promise<Record<string, unknown>>, [unknown]>(),
    listFees: jest.fn<Promise<Record<string, unknown>[]>, [string]>(),
    deleteFee: jest.fn<Promise<void>, [string]>(),
  };
}

const FEE: Record<string, unknown> = { id: "fee-1", feeName: "Resort Fee" };

describe("FeesService", () => {
  describe("create", () => {
    it("calls upsertFee with dto fields", async () => {
      const client = makeClient();
      client.upsertFee.mockResolvedValue(FEE);
      const svc = new FeesService(client as any);

      const result = await svc.create({
        partnerId: "p1",
        propertyId: "prop-1",
        feeName: "Resort Fee",
        feeType: "FLAT_PER_NIGHT",
        flatAmount: 25,
        currency: "USD",
        effectiveFrom: "2026-01-01",
      } as any);

      expect(result).toBe(FEE);
      expect(client.upsertFee).toHaveBeenCalledWith(
        expect.objectContaining({ partnerId: "p1", feeName: "Resort Fee" }),
      );
    });
  });

  describe("findAll", () => {
    it("calls listFees with partnerId", async () => {
      const client = makeClient();
      client.listFees.mockResolvedValue([FEE]);
      const svc = new FeesService(client as any);

      const result = await svc.findAll("p1");
      expect(client.listFees).toHaveBeenCalledWith("p1");
      expect(result).toEqual([FEE]);
    });
  });

  describe("update", () => {
    it("calls upsertFee with id and partnerId", async () => {
      const client = makeClient();
      client.upsertFee.mockResolvedValue(FEE);
      const svc = new FeesService(client as any);

      const result = await svc.update("fee-1", "p1", {
        feeName: "Updated Fee",
        feeType: "FLAT_PER_STAY",
        effectiveFrom: "2026-02-01",
      } as any);

      expect(result).toBe(FEE);
      expect(client.upsertFee).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "fee-1",
          partnerId: "p1",
          feeName: "Updated Fee",
        }),
      );
    });

    it("uses defaults for optional dto fields", async () => {
      const client = makeClient();
      client.upsertFee.mockResolvedValue(FEE);
      const svc = new FeesService(client as any);

      await svc.update("fee-1", "p1", {} as any);

      expect(client.upsertFee).toHaveBeenCalledWith(
        expect.objectContaining({ feeName: "", feeType: "FLAT_PER_NIGHT" }),
      );
    });
  });

  describe("remove", () => {
    it("calls deleteFee with id", async () => {
      const client = makeClient();
      client.deleteFee.mockResolvedValue(undefined);
      const svc = new FeesService(client as any);

      await svc.remove("fee-1");
      expect(client.deleteFee).toHaveBeenCalledWith("fee-1");
    });
  });
});
