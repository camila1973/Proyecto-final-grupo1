import { RefundsController } from "./refunds.controller.js";

describe("RefundsController", () => {
  it("delegates to RefundsService with the request IP and DTO actor metadata", () => {
    const service = { issueRefund: jest.fn().mockResolvedValue({}) };
    const controller = new RefundsController(service as any);

    void controller.issueRefund(
      "res-uuid",
      { reason: "guest_cancelled", actorId: "user-7", actorRole: "guest" },
      "10.0.0.1",
    );

    expect(service.issueRefund).toHaveBeenCalledWith({
      reservationId: "res-uuid",
      reason: "guest_cancelled",
      actorId: "user-7",
      actorRole: "guest",
      requestIp: "10.0.0.1",
    });
  });

  it("normalizes missing actor + ip to null so the audit row is well-formed", () => {
    const service = { issueRefund: jest.fn().mockResolvedValue({}) };
    const controller = new RefundsController(service as any);

    void controller.issueRefund("res-uuid", { reason: "system" }, "");

    expect(service.issueRefund).toHaveBeenCalledWith({
      reservationId: "res-uuid",
      reason: "system",
      actorId: null,
      actorRole: null,
      requestIp: null,
    });
  });
});
