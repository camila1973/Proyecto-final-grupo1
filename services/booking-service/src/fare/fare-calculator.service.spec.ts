import {
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { FareCalculatorService, FareInput } from "./fare-calculator.service.js";

// ─── Mock helpers ──────────────────────────────────────────────────────────────

function makeInventoryClient(ratePerNight: number | null) {
  return {
    getRateForStay: () =>
      ratePerNight === null
        ? Promise.reject(new NotFoundException("No rates found"))
        : Promise.resolve(ratePerNight),
  } as any;
}

function makeTaxRepo(rules: any[] = []) {
  return { findApplicable: () => Promise.resolve(rules) } as any;
}

function makeFeeRepo(fees: any[] = []) {
  return { findApplicable: () => Promise.resolve(fees) } as any;
}

function makeInput(overrides: Partial<FareInput> = {}): FareInput {
  return {
    propertyId: "prop-1",
    roomId: "room-1",
    partnerId: "partner-1",
    checkIn: new Date("2026-05-01"),
    checkOut: new Date("2026-05-04"), // 3 nights
    propertyLocation: { country: "MX", city: "cancun" },
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("FareCalculatorService", () => {
  describe("percentage tax", () => {
    it("applies IVA at 16% to subtotal", async () => {
      const svc = new FareCalculatorService(
        makeInventoryClient(150),
        makeTaxRepo([
          {
            tax_name: "IVA",
            tax_type: "PERCENTAGE",
            rate: "16.00",
            flat_amount: null,
            currency: "USD",
          },
        ]),
        makeFeeRepo(),
      );

      const result = await svc.calculate(makeInput());

      // 3 nights × $150 = $450 subtotal; IVA = 450 × 0.16 = $72
      expect(result.nights).toBe(3);
      expect(result.roomRateUsd).toBe(150);
      expect(result.subtotalUsd).toBe(450);
      expect(result.taxes).toHaveLength(1);
      expect(result.taxes[0]).toMatchObject({
        name: "IVA",
        type: "PERCENTAGE",
        rate: 16,
        amountUsd: 72,
      });
      expect(result.taxTotalUsd).toBe(72);
      expect(result.feeTotalUsd).toBe(0);
      expect(result.totalUsd).toBe(522);
    });

    it("applies multiple percentage taxes cumulatively", async () => {
      const svc = new FareCalculatorService(
        makeInventoryClient(100),
        makeTaxRepo([
          {
            tax_name: "IVA",
            tax_type: "PERCENTAGE",
            rate: "16.00",
            flat_amount: null,
            currency: "USD",
          },
          {
            tax_name: "ISH",
            tax_type: "PERCENTAGE",
            rate: "3.00",
            flat_amount: null,
            currency: "USD",
          },
        ]),
        makeFeeRepo(),
      );

      const result = await svc.calculate(makeInput());

      // 3 nights × $100 = $300 subtotal; IVA = $48; ISH = $9
      expect(result.taxTotalUsd).toBe(57);
      expect(result.totalUsd).toBe(357);
    });
  });

  describe("flat-per-night fee", () => {
    it("multiplies flat amount by nights", async () => {
      const svc = new FareCalculatorService(
        makeInventoryClient(200),
        makeTaxRepo(),
        makeFeeRepo([
          {
            fee_name: "Resort Fee",
            fee_type: "FLAT_PER_NIGHT",
            rate: null,
            flat_amount: "25.00",
            currency: "USD",
          },
        ]),
      );

      const result = await svc.calculate(makeInput());

      // Resort Fee = $25 × 3 = $75
      expect(result.fees[0]).toMatchObject({
        name: "Resort Fee",
        type: "FLAT_PER_NIGHT",
        amountUsd: 75,
        totalUsd: 75,
      });
      expect(result.feeTotalUsd).toBe(75);
    });
  });

  describe("percentage fee", () => {
    it("applies percentage fee to subtotal and exposes rate on the line item", async () => {
      const svc = new FareCalculatorService(
        makeInventoryClient(200),
        makeTaxRepo(),
        makeFeeRepo([
          {
            fee_name: "Booking Fee",
            fee_type: "PERCENTAGE",
            rate: "5.00",
            flat_amount: null,
            currency: "USD",
          },
        ]),
      );

      const result = await svc.calculate(makeInput());

      // 3 nights × $200 = $600 subtotal; 5% of $600 = $30
      expect(result.fees[0]).toMatchObject({
        name: "Booking Fee",
        type: "PERCENTAGE",
        rate: 5,
        amountUsd: 30,
      });
      expect(result.feeTotalUsd).toBe(30);
    });
  });

  describe("flat-per-stay fee", () => {
    it("applies flat amount once regardless of nights", async () => {
      const svc = new FareCalculatorService(
        makeInventoryClient(200),
        makeTaxRepo(),
        makeFeeRepo([
          {
            fee_name: "Cleaning Fee",
            fee_type: "FLAT_PER_STAY",
            rate: null,
            flat_amount: "50.00",
            currency: "USD",
          },
        ]),
      );

      const result = await svc.calculate(makeInput());

      expect(result.fees[0]).toMatchObject({
        name: "Cleaning Fee",
        type: "FLAT_PER_STAY",
        amountUsd: 50,
        totalUsd: 50,
      });
      expect(result.feeTotalUsd).toBe(50);
    });
  });

  describe("FX conversion path", () => {
    it("throws when currency is not USD", async () => {
      const svc = new FareCalculatorService(
        makeInventoryClient(100),
        makeTaxRepo([
          {
            tax_name: "Local Tax",
            tax_type: "FLAT_PER_NIGHT",
            rate: null,
            flat_amount: "10.00",
            currency: "MXN",
          },
        ]),
        makeFeeRepo(),
      );

      await expect(svc.calculate(makeInput())).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("fail-fast on missing price", () => {
    it("throws NotFoundException when inventory-service has no rates for the stay", async () => {
      const svc = new FareCalculatorService(
        makeInventoryClient(null),
        makeTaxRepo(),
        makeFeeRepo(),
      );

      await expect(svc.calculate(makeInput())).rejects.toThrow(
        NotFoundException,
      );
    });

    it("rejects within 500ms", async () => {
      const svc = new FareCalculatorService(
        makeInventoryClient(null),
        makeTaxRepo(),
        makeFeeRepo(),
      );

      const start = Date.now();
      await expect(svc.calculate(makeInput())).rejects.toThrow();
      expect(Date.now() - start).toBeLessThan(500);
    });
  });

  describe("fail-fast on HTTP error", () => {
    it("propagates inventory-service errors immediately", async () => {
      const failingClient = {
        getRateForStay: async () => {
          throw new Error("inventory-service unreachable");
        },
      } as any;

      const svc = new FareCalculatorService(
        failingClient,
        makeTaxRepo(),
        makeFeeRepo(),
      );

      await expect(svc.calculate(makeInput())).rejects.toThrow(
        "inventory-service unreachable",
      );
    });

    it("propagates tax repo errors", async () => {
      const failingTaxRepo = {
        findApplicable: async () => {
          throw new Error("Tax repo failure");
        },
      } as any;

      const svc = new FareCalculatorService(
        makeInventoryClient(100),
        failingTaxRepo,
        makeFeeRepo(),
      );

      await expect(svc.calculate(makeInput())).rejects.toThrow(
        "Tax repo failure",
      );
    });
  });

  describe("full breakdown", () => {
    it("calculates MX property with IVA + ISH + resort fee", async () => {
      const svc = new FareCalculatorService(
        makeInventoryClient(150),
        makeTaxRepo([
          {
            tax_name: "IVA",
            tax_type: "PERCENTAGE",
            rate: "16.00",
            flat_amount: null,
            currency: "USD",
          },
          {
            tax_name: "ISH",
            tax_type: "PERCENTAGE",
            rate: "3.00",
            flat_amount: null,
            currency: "USD",
          },
        ]),
        makeFeeRepo([
          {
            fee_name: "Resort Fee",
            fee_type: "FLAT_PER_NIGHT",
            rate: null,
            flat_amount: "25.00",
            currency: "USD",
          },
        ]),
      );

      const result = await svc.calculate(makeInput());

      // nights=3, rate=$150, subtotal=$450
      // IVA = 450×0.16 = $72, ISH = 450×0.03 = $13.50 → taxTotal = $85.50
      // Resort Fee = 25×3 = $75 → feeTotal = $75
      // total = 450 + 85.50 + 75 = $610.50
      expect(result.subtotalUsd).toBe(450);
      expect(result.taxTotalUsd).toBe(85.5);
      expect(result.feeTotalUsd).toBe(75);
      expect(result.totalUsd).toBe(610.5);
    });
  });
});
