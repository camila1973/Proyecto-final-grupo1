import { RefundsController } from "./refunds.controller.js";

describe("RefundsController", () => {
  it("prefers x-forwarded-for over the direct request IP for audit logging", () => {
    const service = { issueRefund: jest.fn().mockResolvedValue({}) };
    const controller = new RefundsController(service as any);

    void controller.issueRefund(
      "res-uuid",
      { reason: "guest_cancelled", actorId: "user-7", actorRole: "guest" },
      "203.0.113.5",
      "10.0.0.1",
    );

    expect(service.issueRefund).toHaveBeenCalledWith({
      reservationId: "res-uuid",
      reason: "guest_cancelled",
      actorId: "user-7",
      actorRole: "guest",
      requestIp: "203.0.113.5",
    });
  });

  it("falls back to the direct request IP when x-forwarded-for is absent", () => {
    const service = { issueRefund: jest.fn().mockResolvedValue({}) };
    const controller = new RefundsController(service as any);

    void controller.issueRefund(
      "res-uuid",
      { reason: "guest_cancelled" },
      undefined as any,
      "10.0.0.1",
    );

    expect(service.issueRefund).toHaveBeenCalledWith(
      expect.objectContaining({ requestIp: "10.0.0.1" }),
    );
  });

  it("normalizes missing actor + ip to null so the audit row is well-formed", () => {
    const service = { issueRefund: jest.fn().mockResolvedValue({}) };
    const controller = new RefundsController(service as any);

    void controller.issueRefund("res-uuid", { reason: "system" }, "", "");

    expect(service.issueRefund).toHaveBeenCalledWith({
      reservationId: "res-uuid",
      reason: "system",
      actorId: null,
      actorRole: null,
      requestIp: null,
    });
  });
});
