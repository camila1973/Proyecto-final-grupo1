import { PartnerFeesService } from "./partner-fees.service.js";

function makeRepo() {
  return {
    upsert: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    softDelete: jest.fn(),
  };
}

function makePublisher() {
  return { publish: jest.fn() };
}

const ROW = {
  id: "fee-1",
  partner_id: "partner-1",
  property_id: "prop-1",
  fee_name: "Resort Fee",
  fee_type: "FLAT_PER_NIGHT",
  rate: null,
  flat_amount: "25.00",
  currency: "USD",
  effective_from: "2026-01-01",
  effective_to: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe("PartnerFeesService", () => {
  describe("upsert", () => {
    it("upserts and publishes upserted event", async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      repo.upsert.mockResolvedValue(ROW);

      const svc = new PartnerFeesService(repo as any, publisher as any);
      const result = await svc.upsert({
        partner_id: "partner-1",
        property_id: "prop-1",
        fee_name: "Resort Fee",
        fee_type: "FLAT_PER_NIGHT",
        flat_amount: 25,
        currency: "USD",
        effective_from: "2026-01-01",
      });

      expect(repo.upsert).toHaveBeenCalled();
      expect(publisher.publish).toHaveBeenCalledWith(
        "partner.fee.upserted",
        expect.objectContaining({ feeId: "fee-1", partnerId: "partner-1" }),
      );
      expect(result).toBe(ROW);
    });

    it("includes rate in event when row has rate", async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      const rowWithRate = { ...ROW, rate: "5.00", flat_amount: null };
      repo.upsert.mockResolvedValue(rowWithRate);

      const svc = new PartnerFeesService(repo as any, publisher as any);
      await svc.upsert({
        partner_id: "p1",
        property_id: null,
        fee_name: "Svc",
        fee_type: "PERCENTAGE",
        rate: 5,
        currency: "USD",
        effective_from: "2026-01-01",
      });

      expect(publisher.publish).toHaveBeenCalledWith(
        "partner.fee.upserted",
        expect.objectContaining({ rate: 5 }),
      );
    });
  });

  describe("findAll", () => {
    it("delegates to repo.findAll", async () => {
      const repo = makeRepo();
      repo.findAll.mockResolvedValue([ROW]);
      const svc = new PartnerFeesService(repo as any, makePublisher() as any);
      const result = await svc.findAll("partner-1");
      expect(repo.findAll).toHaveBeenCalledWith("partner-1");
      expect(result).toEqual([ROW]);
    });
  });

  describe("softDelete", () => {
    it("publishes deleted event when row found", async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      repo.findById.mockResolvedValue(ROW);
      repo.softDelete.mockResolvedValue(undefined);

      const svc = new PartnerFeesService(repo as any, publisher as any);
      await svc.softDelete("fee-1");

      expect(repo.softDelete).toHaveBeenCalledWith("fee-1");
      expect(publisher.publish).toHaveBeenCalledWith(
        "partner.fee.deleted",
        expect.objectContaining({ feeId: "fee-1", partnerId: "partner-1" }),
      );
    });

    it("does not publish when row not found", async () => {
      const repo = makeRepo();
      const publisher = makePublisher();
      repo.findById.mockResolvedValue(null);
      repo.softDelete.mockResolvedValue(undefined);

      const svc = new PartnerFeesService(repo as any, publisher as any);
      await svc.softDelete("fee-missing");

      expect(publisher.publish).not.toHaveBeenCalled();
    });
  });
});
