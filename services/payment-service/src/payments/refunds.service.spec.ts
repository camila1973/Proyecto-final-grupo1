import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { RefundsService } from "./refunds.service.js";

// ─── Stripe mock ──────────────────────────────────────────────────────────────

const mockRefundsCreate = jest.fn();

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    refunds: { create: mockRefundsCreate },
    paymentIntents: { create: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
  }));
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: "pay-uuid",
    reservation_id: "res-uuid",
    stripe_payment_intent_id: "pi_test_abc",
    amount_usd: "350.50",
    currency: "usd",
    status: "captured",
    failure_reason: null,
    guest_email: "guest@example.com",
    ...overrides,
  };
}

function makeQuote(overrides: Record<string, unknown> = {}) {
  return {
    policy: "full_refund",
    refundableUsd: 350.5,
    daysUntilCheckIn: 14,
    ...overrides,
  };
}

const INPUT = {
  reservationId: "res-uuid",
  reason: "guest_cancelled",
  actorId: "user-7",
  actorRole: "guest",
  requestIp: "10.0.0.1",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("RefundsService", () => {
  let service: RefundsService;
  let payments: { findByReservationId: jest.Mock };
  let refunds: { insert: jest.Mock };
  let booking: { getRefundQuote: jest.Mock };
  let notifications: {
    sendRefundIssued: jest.Mock;
    sendRefundFailedAlert: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    payments = {
      findByReservationId: jest.fn().mockResolvedValue(makePayment()),
    };
    refunds = {
      insert: jest.fn().mockResolvedValue({ id: "adj-uuid" }),
    };
    booking = {
      getRefundQuote: jest.fn().mockResolvedValue(makeQuote()),
    };
    notifications = {
      sendRefundIssued: jest.fn().mockResolvedValue(undefined),
      sendRefundFailedAlert: jest.fn().mockResolvedValue(undefined),
    };
    service = new RefundsService(
      payments as any,
      refunds as any,
      booking as any,
      notifications as any,
    );
  });

  it("throws NotFoundException when no payment exists for the reservation", async () => {
    payments.findByReservationId.mockResolvedValue(undefined);

    await expect(service.issueRefund(INPUT)).rejects.toThrow(NotFoundException);
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when the payment is not captured", async () => {
    payments.findByReservationId.mockResolvedValue(
      makePayment({ status: "pending" }),
    );

    await expect(service.issueRefund(INPUT)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });

  it("records a zero-amount audit row and skips Stripe when policy is no_refund", async () => {
    booking.getRefundQuote.mockResolvedValue(
      makeQuote({ policy: "no_refund", refundableUsd: 0 }),
    );

    const result = await service.issueRefund(INPUT);

    expect(result).toEqual({
      status: "skipped",
      policy: "no_refund",
      refundedUsd: 0,
      externalRef: null,
      adjustmentId: "adj-uuid",
    });
    expect(mockRefundsCreate).not.toHaveBeenCalled();
    expect(refunds.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "refund",
        amount_usd: 0,
        status: "succeeded",
        external_ref: null,
        actor_id: "user-7",
        actor_role: "guest",
        request_ip: "10.0.0.1",
      }),
    );
    expect(notifications.sendRefundIssued).not.toHaveBeenCalled();
  });

  it("calls Stripe with the original PaymentIntent and amount in cents", async () => {
    mockRefundsCreate.mockResolvedValue({ id: "re_test_xyz" });

    await service.issueRefund(INPUT);

    expect(mockRefundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: "pi_test_abc",
        amount: 35050,
        reason: "requested_by_customer",
      }),
    );
  });

  it("persists a successful refund audit row with the Stripe refund id", async () => {
    mockRefundsCreate.mockResolvedValue({ id: "re_test_xyz" });

    await service.issueRefund(INPUT);

    expect(refunds.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "refund",
        amount_usd: 350.5,
        external_ref: "re_test_xyz",
        status: "succeeded",
        actor_id: "user-7",
        actor_role: "guest",
        request_ip: "10.0.0.1",
      }),
    );
  });

  it("emails the guest with the refund receipt", async () => {
    mockRefundsCreate.mockResolvedValue({ id: "re_test_xyz" });

    await service.issueRefund(INPUT);

    expect(notifications.sendRefundIssued).toHaveBeenCalledWith({
      to: "guest@example.com",
      reservationId: "res-uuid",
      refundedUsd: 350.5,
      policy: "full_refund",
      refundExternalRef: "re_test_xyz",
    });
  });

  it("returns a structured success result", async () => {
    mockRefundsCreate.mockResolvedValue({ id: "re_test_xyz" });

    const result = await service.issueRefund(INPUT);

    expect(result).toEqual({
      status: "succeeded",
      policy: "full_refund",
      refundedUsd: 350.5,
      externalRef: "re_test_xyz",
      adjustmentId: "adj-uuid",
    });
  });

  it("alerts customer support and writes a failed audit row when Stripe rejects", async () => {
    mockRefundsCreate.mockRejectedValue(new Error("card_not_refundable"));

    await expect(service.issueRefund(INPUT)).rejects.toThrow(
      BadGatewayException,
    );

    expect(refunds.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        failure_reason: "card_not_refundable",
        external_ref: null,
      }),
    );
    expect(notifications.sendRefundFailedAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: "res-uuid",
        paymentIntentId: "pi_test_abc",
        attemptedUsd: 350.5,
        failureReason: "card_not_refundable",
        actorId: "user-7",
        actorRole: "guest",
      }),
    );
    expect(notifications.sendRefundIssued).not.toHaveBeenCalled();
  });

  it("does not throw if alerting customer support fails", async () => {
    mockRefundsCreate.mockRejectedValue(new Error("gateway_down"));
    notifications.sendRefundFailedAlert.mockRejectedValue(
      new Error("smtp_down"),
    );

    await expect(service.issueRefund(INPUT)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it("does not throw if the guest receipt email fails", async () => {
    mockRefundsCreate.mockResolvedValue({ id: "re_test_xyz" });
    notifications.sendRefundIssued.mockRejectedValue(new Error("smtp_down"));

    await expect(service.issueRefund(INPUT)).resolves.toMatchObject({
      status: "succeeded",
    });
  });

  it("verifies the cancellation policy from booking-service before refunding", async () => {
    mockRefundsCreate.mockResolvedValue({ id: "re_test_xyz" });

    await service.issueRefund(INPUT);

    expect(booking.getRefundQuote).toHaveBeenCalledWith("res-uuid");
  });

  it("uses the partial refund amount returned by the policy", async () => {
    booking.getRefundQuote.mockResolvedValue(
      makeQuote({ policy: "partial_refund", refundableUsd: 175.25 }),
    );
    mockRefundsCreate.mockResolvedValue({ id: "re_test_xyz" });

    const result = await service.issueRefund(INPUT);

    expect(mockRefundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 17525 }),
    );
    expect(result.refundedUsd).toBe(175.25);
    expect(result.policy).toBe("partial_refund");
  });

  it("forwards anonymized actor metadata to Stripe so refunds remain traceable", async () => {
    mockRefundsCreate.mockResolvedValue({ id: "re_test_xyz" });

    await service.issueRefund({
      ...INPUT,
      actorId: null,
      actorRole: null,
    });

    expect(mockRefundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          reservation_id: "res-uuid",
          actor_id: "",
          actor_role: "",
        },
      }),
    );
  });
});
