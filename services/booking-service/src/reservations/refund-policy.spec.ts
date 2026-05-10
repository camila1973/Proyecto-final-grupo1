import { computeDaysUntilCheckIn, quoteRefund } from "./refund-policy.js";

describe("refund-policy", () => {
  const NOW = new Date("2026-05-10T12:00:00Z");

  describe("computeDaysUntilCheckIn", () => {
    it("returns positive days for a future check-in", () => {
      expect(computeDaysUntilCheckIn("2026-05-20", NOW)).toBe(10);
    });

    it("returns 0 when check-in is today", () => {
      expect(computeDaysUntilCheckIn("2026-05-10", NOW)).toBe(0);
    });

    it("returns negative days for past check-ins", () => {
      expect(computeDaysUntilCheckIn("2026-05-01", NOW)).toBe(-9);
    });

    it("ignores time-of-day in the input string", () => {
      expect(computeDaysUntilCheckIn("2026-05-15T18:00:00", NOW)).toBe(5);
    });
  });

  describe("quoteRefund", () => {
    it("grants full refund when check-in is at least 7 days away", () => {
      const quote = quoteRefund(1000, "2026-05-17", NOW);
      expect(quote).toEqual({
        policy: "full_refund",
        refundableUsd: 1000,
        daysUntilCheckIn: 7,
      });
    });

    it("grants partial refund (50%) when check-in is 2-6 days away", () => {
      const quote = quoteRefund(800, "2026-05-13", NOW);
      expect(quote).toEqual({
        policy: "partial_refund",
        refundableUsd: 400,
        daysUntilCheckIn: 3,
      });
    });

    it("denies refund when check-in is less than 2 days away", () => {
      const quote = quoteRefund(500, "2026-05-11", NOW);
      expect(quote).toEqual({
        policy: "no_refund",
        refundableUsd: 0,
        daysUntilCheckIn: 1,
      });
    });

    it("denies refund when check-in is in the past", () => {
      const quote = quoteRefund(500, "2026-05-01", NOW);
      expect(quote.policy).toBe("no_refund");
      expect(quote.refundableUsd).toBe(0);
    });

    it("rounds the partial refund amount to 2 decimal places", () => {
      const quote = quoteRefund(123.456, "2026-05-13", NOW);
      expect(quote.refundableUsd).toBe(61.73);
    });
  });
});
