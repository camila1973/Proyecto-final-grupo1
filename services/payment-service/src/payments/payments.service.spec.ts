import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PaymentsService } from "./payments.service.js";

// ─── Stripe mock ──────────────────────────────────────────────────────────────
// Jest hoists this before the import of payments.service, so the module-level
// `new Stripe(...)` call inside the service constructor receives the mock.

const mockPaymentIntentsCreate = jest.fn();
const mockWebhooksConstructEvent = jest.fn();

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: { create: mockPaymentIntentsCreate },
    webhooks: { constructEvent: mockWebhooksConstructEvent },
  }));
});

// ─── Global fetch mock ────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRepo() {
  return {
    create: jest.fn(),
    findByReservationId: jest.fn(),
    findByIntentId: jest.fn(),
    updateByIntentId: jest.fn(),
  };
}

function makeBookingClient() {
  return {
    submitReservation: jest.fn().mockResolvedValue(undefined),
    reholdReservation: jest.fn().mockResolvedValue(undefined),
    confirmReservation: jest.fn().mockResolvedValue(undefined),
    failReservation: jest.fn().mockResolvedValue(undefined),
  };
}

function makeNotifications() {
  return {
    sendPaymentSucceeded: jest.fn().mockResolvedValue(undefined),
    sendPaymentFailed: jest.fn().mockResolvedValue(undefined),
  };
}

function makeStripeIntent(overrides: Record<string, unknown> = {}) {
  return {
    id: "pi_test_abc",
    amount: 35050,
    client_secret: "pi_test_abc_secret",
    metadata: {
      reservation_id: "res-uuid",
      guest_email: "guest@example.com",
    },
    payment_method: "pm_token_xyz",
    last_payment_error: null,
    ...overrides,
  };
}

function makePaymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "pay-uuid",
    reservation_id: "res-uuid",
    stripe_payment_intent_id: "pi_test_abc",
    stripe_payment_method_id: null as string | null,
    amount_usd: "350.50",
    currency: "usd",
    status: "pending",
    failure_reason: null as string | null,
    guest_email: "guest@example.com",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

const INITIATE_DTO = {
  reservationId: "res-uuid",
  amountUsd: 350.5,
  currency: "usd",
  guestEmail: "guest@example.com",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PaymentsService", () => {
  let service: PaymentsService;
  let repo: ReturnType<typeof makeRepo>;
  let booking: ReturnType<typeof makeBookingClient>;
  let notifications: ReturnType<typeof makeNotifications>;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = makeRepo();
    booking = makeBookingClient();
    notifications = makeNotifications();
    service = new PaymentsService(
      repo as any,
      booking as any,
      notifications as any,
    );
  });

  // ─── initiate ─────────────────────────────────────────────────────────────

  describe("initiate", () => {
    it("creates a Stripe PaymentIntent with correct amount in cents", async () => {
      const intent = makeStripeIntent();
      mockPaymentIntentsCreate.mockResolvedValue(intent);
      repo.create.mockResolvedValue(makePaymentRow());

      await service.initiate(INITIATE_DTO);

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 35050, // 350.50 * 100
          currency: "usd",
        }),
      );
    });

    it("sets metadata.reservation_id and receipt_email on the PaymentIntent", async () => {
      mockPaymentIntentsCreate.mockResolvedValue(makeStripeIntent());
      repo.create.mockResolvedValue(makePaymentRow());

      await service.initiate(INITIATE_DTO);

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            reservation_id: "res-uuid",
            guest_email: "guest@example.com",
          },
          receipt_email: "guest@example.com",
        }),
      );
    });

    it("stores the payment record with status=pending", async () => {
      mockPaymentIntentsCreate.mockResolvedValue(makeStripeIntent());
      repo.create.mockResolvedValue(makePaymentRow());

      await service.initiate(INITIATE_DTO);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reservation_id: "res-uuid",
          stripe_payment_intent_id: "pi_test_abc",
          stripe_payment_method_id: null,
          status: "pending",
          guest_email: "guest@example.com",
        }),
      );
    });

    it("returns paymentId and clientSecret", async () => {
      mockPaymentIntentsCreate.mockResolvedValue(makeStripeIntent());
      const row = makePaymentRow({ id: "pay-uuid" });
      repo.create.mockResolvedValue(row);

      const result = await service.initiate(INITIATE_DTO);

      expect(result).toEqual({
        paymentId: "pay-uuid",
        clientSecret: "pi_test_abc_secret",
      });
    });
  });

  // ─── handleWebhook ────────────────────────────────────────────────────────

  describe("handleWebhook", () => {
    const rawBody = Buffer.from("{}");
    const sig = "t=123,v1=abc";

    it("throws BadRequestException when Stripe signature is invalid", async () => {
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      await expect(service.handleWebhook(rawBody, sig)).rejects.toThrow(
        BadRequestException,
      );
    });

    describe("payment_intent.succeeded", () => {
      it("marks payment as captured with the card token", async () => {
        const intent = makeStripeIntent({ payment_method: "pm_token_xyz" });
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.succeeded",
          data: { object: intent },
        });

        await service.handleWebhook(rawBody, sig);

        expect(repo.updateByIntentId).toHaveBeenCalledWith("pi_test_abc", {
          status: "captured",
          stripe_payment_method_id: "pm_token_xyz",
        });
      });

      it("extracts payment_method.id when payment_method is an object", async () => {
        const intent = makeStripeIntent({
          payment_method: { id: "pm_token_nested" },
        });
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.succeeded",
          data: { object: intent },
        });

        await service.handleWebhook(rawBody, sig);

        expect(repo.updateByIntentId).toHaveBeenCalledWith(
          "pi_test_abc",
          expect.objectContaining({
            stripe_payment_method_id: "pm_token_nested",
          }),
        );
      });

      it("calls BookingClient.confirmReservation with the reservation id", async () => {
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.succeeded",
          data: { object: makeStripeIntent() },
        });

        await service.handleWebhook(rawBody, sig);

        expect(booking.confirmReservation).toHaveBeenCalledWith("res-uuid");
      });

      it("sends the payment-succeeded email to the guest", async () => {
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.succeeded",
          data: { object: makeStripeIntent() },
        });

        await service.handleWebhook(rawBody, sig);

        expect(notifications.sendPaymentSucceeded).toHaveBeenCalledWith(
          expect.objectContaining({
            to: "guest@example.com",
            reservationId: "res-uuid",
            amountUsd: 350.5, // 35050 / 100
          }),
        );
      });

      it("does not throw when the booking-service call fails", async () => {
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.succeeded",
          data: { object: makeStripeIntent() },
        });
        booking.confirmReservation.mockRejectedValue(new Error("unavailable"));

        await expect(
          service.handleWebhook(rawBody, sig),
        ).resolves.not.toThrow();
      });
    });

    describe("payment_intent.payment_failed", () => {
      it("marks payment as failed with the error message", async () => {
        const intent = makeStripeIntent({
          last_payment_error: { message: "Your card was declined." },
        });
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.payment_failed",
          data: { object: intent },
        });

        await service.handleWebhook(rawBody, sig);

        expect(repo.updateByIntentId).toHaveBeenCalledWith("pi_test_abc", {
          status: "failed",
          failure_reason: "Your card was declined.",
        });
      });

      it("uses 'Payment declined' as fallback when last_payment_error is null", async () => {
        const intent = makeStripeIntent({ last_payment_error: null });
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.payment_failed",
          data: { object: intent },
        });

        await service.handleWebhook(rawBody, sig);

        expect(repo.updateByIntentId).toHaveBeenCalledWith(
          "pi_test_abc",
          expect.objectContaining({ failure_reason: "Payment declined" }),
        );
      });

      it("sends the payment-failed email to the guest", async () => {
        const intent = makeStripeIntent({
          last_payment_error: { message: "Insufficient funds." },
        });
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.payment_failed",
          data: { object: intent },
        });

        await service.handleWebhook(rawBody, sig);

        expect(notifications.sendPaymentFailed).toHaveBeenCalledWith(
          expect.objectContaining({
            to: "guest@example.com",
            reservationId: "res-uuid",
            reason: "Insufficient funds.",
          }),
        );
      });

      it("calls BookingClient.failReservation with reservation id and Stripe reason", async () => {
        const intent = makeStripeIntent({
          last_payment_error: { message: "Your card was declined." },
        });
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.payment_failed",
          data: { object: intent },
        });

        await service.handleWebhook(rawBody, sig);

        expect(booking.failReservation).toHaveBeenCalledWith(
          "res-uuid",
          "Your card was declined.",
        );
      });

      it("passes 'Payment declined' fallback reason when last_payment_error is null", async () => {
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.payment_failed",
          data: { object: makeStripeIntent({ last_payment_error: null }) },
        });

        await service.handleWebhook(rawBody, sig);

        expect(booking.failReservation).toHaveBeenCalledWith(
          "res-uuid",
          "Payment declined",
        );
      });

      it("does not call BookingClient.confirmReservation for failed payments", async () => {
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.payment_failed",
          data: { object: makeStripeIntent() },
        });

        await service.handleWebhook(rawBody, sig);

        expect(booking.confirmReservation).not.toHaveBeenCalled();
      });
    });

    it("ignores unhandled event types without error", async () => {
      mockWebhooksConstructEvent.mockReturnValue({
        type: "customer.created",
        data: { object: {} },
      });

      await expect(service.handleWebhook(rawBody, sig)).resolves.not.toThrow();
      expect(repo.updateByIntentId).not.toHaveBeenCalled();
    });
  });

  // ─── getStatus ────────────────────────────────────────────────────────────

  describe("getStatus", () => {
    it("returns the payment status for an existing reservation", async () => {
      const row = makePaymentRow({ status: "captured" });
      repo.findByReservationId.mockResolvedValue(row);

      const result = await service.getStatus("res-uuid");

      expect(result).toEqual({ status: "captured", failureReason: undefined });
    });

    it("includes failureReason when payment failed", async () => {
      const row = makePaymentRow({
        status: "failed",
        failure_reason: "Insufficient funds.",
      });
      repo.findByReservationId.mockResolvedValue(row);

      const result = await service.getStatus("res-uuid");

      expect(result).toEqual({
        status: "failed",
        failureReason: "Insufficient funds.",
      });
    });

    it("throws NotFoundException when no payment record exists", async () => {
      repo.findByReservationId.mockResolvedValue(undefined);

      await expect(service.getStatus("unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
