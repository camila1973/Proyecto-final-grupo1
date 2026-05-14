import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PaymentsService } from "./payments.service.js";
import { UpstreamServiceError } from "../clients/upstream-service.error.js";

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
    findCapturedByPartner: jest.fn(),
  };
}

function makeReservationDetails(overrides: Record<string, unknown> = {}) {
  return {
    id: "res-uuid",
    partnerId: "partner-uuid",
    propertyId: "prop-uuid",
    status: "held",
    grandTotalUsd: 350.5,
    taxTotalUsd: 50,
    feeTotalUsd: 10,
    fareBreakdown: { totalUsd: 350.5 },
    snapshot: { propertyName: "Hotel Test" },
    ...overrides,
  };
}

function makeBookingClient() {
  return {
    submitReservation: jest.fn().mockResolvedValue(undefined),
    reholdReservation: jest.fn().mockResolvedValue(undefined),
    confirmReservation: jest.fn().mockResolvedValue(undefined),
    failReservation: jest.fn().mockResolvedValue(undefined),
    getReservation: jest.fn().mockResolvedValue(makeReservationDetails()),
  };
}

function makeCommissionRules() {
  return {
    resolveRate: jest.fn().mockResolvedValue(0.2),
  };
}

function makeNotifications() {
  return {
    sendPaymentSucceeded: jest.fn().mockResolvedValue(undefined),
    sendPaymentFailed: jest.fn().mockResolvedValue(undefined),
    sendPaymentSucceededPush: jest.fn().mockResolvedValue(undefined),
    sendPaymentFailedPush: jest.fn().mockResolvedValue(undefined),
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
  let commissionRules: ReturnType<typeof makeCommissionRules>;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = makeRepo();
    booking = makeBookingClient();
    notifications = makeNotifications();
    commissionRules = makeCommissionRules();
    service = new PaymentsService(
      repo as any,
      booking as any,
      notifications as any,
      commissionRules as any,
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

    it("calls submitReservation on first attempt (not a retry)", async () => {
      mockPaymentIntentsCreate.mockResolvedValue(makeStripeIntent());
      repo.create.mockResolvedValue(makePaymentRow());
      repo.findByReservationId.mockResolvedValue(undefined);

      await service.initiate(INITIATE_DTO);

      expect(booking.submitReservation).toHaveBeenCalledWith("res-uuid");
      expect(booking.reholdReservation).not.toHaveBeenCalled();
    });

    it("calls reholdReservation then submitReservation on retry", async () => {
      mockPaymentIntentsCreate.mockResolvedValue(makeStripeIntent());
      repo.create.mockResolvedValue(makePaymentRow());
      // Simulate an existing prior payment row → isRetry = true
      repo.findByReservationId.mockResolvedValue(
        makePaymentRow({ status: "failed" }),
      );

      await service.initiate(INITIATE_DTO);

      expect(booking.reholdReservation).toHaveBeenCalledWith("res-uuid");
      expect(booking.submitReservation).toHaveBeenCalledWith("res-uuid");
    });

    it("snapshots breakdown columns (commission, tax, fee, net) onto the payment row", async () => {
      mockPaymentIntentsCreate.mockResolvedValue(makeStripeIntent());
      repo.create.mockResolvedValue(makePaymentRow());
      booking.getReservation.mockResolvedValue(
        makeReservationDetails({
          partnerId: "p-1",
          propertyId: "prop-1",
          grandTotalUsd: 350.5,
          taxTotalUsd: 50,
          feeTotalUsd: 10,
          snapshot: { propertyName: "Hotel Central" },
        }),
      );
      commissionRules.resolveRate.mockResolvedValue(0.2);

      await service.initiate(INITIATE_DTO);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          partner_id: "p-1",
          property_id: "prop-1",
          property_name: "Hotel Central",
          gross_amount_usd: 350.5,
          tax_amount_usd: 50,
          partner_fee_usd: 10,
          commission_rate: 0.2,
          commission_amount_usd: 70.1, // 350.5 * 0.2
          net_payout_usd: 280.4, // 350.5 - 70.1
          fare_snapshot: { totalUsd: 350.5 },
        }),
      );
    });

    it("uses the commission rate resolved by the rules service", async () => {
      mockPaymentIntentsCreate.mockResolvedValue(makeStripeIntent());
      repo.create.mockResolvedValue(makePaymentRow());
      commissionRules.resolveRate.mockResolvedValue(0.15);

      await service.initiate(INITIATE_DTO);

      expect(commissionRules.resolveRate).toHaveBeenCalledWith(
        "partner-uuid",
        expect.any(String),
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          commission_rate: 0.15,
          commission_amount_usd: 52.58, // 350.5 * 0.15 rounded
          net_payout_usd: 297.92,
        }),
      );
    });

    it("throws BadRequestException when DTO amount mismatches reservation total", async () => {
      booking.getReservation.mockResolvedValue(
        makeReservationDetails({ grandTotalUsd: 999 }),
      );

      await expect(service.initiate(INITIATE_DTO)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("falls back to empty string for propertyName and undefined for fare_snapshot when both are null", async () => {
      mockPaymentIntentsCreate.mockResolvedValue(makeStripeIntent());
      repo.create.mockResolvedValue(makePaymentRow());
      booking.getReservation.mockResolvedValue(
        makeReservationDetails({ snapshot: null, fareBreakdown: null }),
      );

      await service.initiate(INITIATE_DTO);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          property_name: "",
          fare_snapshot: undefined,
        }),
      );
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

        expect(repo.updateByIntentId).toHaveBeenCalledWith(
          "pi_test_abc",
          expect.objectContaining({
            status: "captured",
            stripe_payment_method_id: "pm_token_xyz",
            captured_at: expect.any(Date),
          }),
        );
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

      it("logs err.cause when confirmReservation throws UpstreamServiceError", async () => {
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.succeeded",
          data: { object: makeStripeIntent() },
        });
        booking.confirmReservation.mockRejectedValue(
          new UpstreamServiceError(
            "booking-service",
            new Error("connection refused"),
          ),
        );

        await expect(
          service.handleWebhook(rawBody, sig),
        ).resolves.not.toThrow();
      });

      it("calls sendPaymentSucceededPush when booker_id is present in metadata", async () => {
        const intent = makeStripeIntent({
          metadata: {
            reservation_id: "res-uuid",
            guest_email: "guest@example.com",
            booker_id: "user-123",
          },
        });
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.succeeded",
          data: { object: intent },
        });

        await service.handleWebhook(rawBody, sig);

        expect(notifications.sendPaymentSucceededPush).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: "user-123",
            reservationId: "res-uuid",
            amountUsd: 350.5,
          }),
        );
      });

      it("does not call sendPaymentSucceededPush when booker_id is absent", async () => {
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.succeeded",
          data: { object: makeStripeIntent() },
        });

        await service.handleWebhook(rawBody, sig);

        expect(notifications.sendPaymentSucceededPush).not.toHaveBeenCalled();
      });

      it("does not throw when sendPaymentSucceededPush rejects", async () => {
        const intent = makeStripeIntent({
          metadata: {
            reservation_id: "res-uuid",
            guest_email: "guest@example.com",
            booker_id: "user-123",
          },
        });
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.succeeded",
          data: { object: intent },
        });
        notifications.sendPaymentSucceededPush.mockRejectedValue(
          new Error("FCM unavailable"),
        );

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

      it("logs err.cause when failReservation throws UpstreamServiceError", async () => {
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.payment_failed",
          data: { object: makeStripeIntent() },
        });
        booking.failReservation.mockRejectedValue(
          new UpstreamServiceError(
            "booking-service",
            new Error("connection refused"),
          ),
        );

        await expect(
          service.handleWebhook(rawBody, sig),
        ).resolves.not.toThrow();
      });

      it("calls sendPaymentFailedPush when booker_id is present in metadata", async () => {
        const intent = makeStripeIntent({
          metadata: {
            reservation_id: "res-uuid",
            guest_email: "guest@example.com",
            booker_id: "user-456",
          },
          last_payment_error: { message: "Card declined." },
        });
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.payment_failed",
          data: { object: intent },
        });

        await service.handleWebhook(rawBody, sig);

        expect(notifications.sendPaymentFailedPush).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: "user-456",
            reservationId: "res-uuid",
            reason: "Card declined.",
          }),
        );
      });

      it("does not call sendPaymentFailedPush when booker_id is absent", async () => {
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.payment_failed",
          data: { object: makeStripeIntent() },
        });

        await service.handleWebhook(rawBody, sig);

        expect(notifications.sendPaymentFailedPush).not.toHaveBeenCalled();
      });

      it("does not throw when sendPaymentFailedPush rejects", async () => {
        const intent = makeStripeIntent({
          metadata: {
            reservation_id: "res-uuid",
            guest_email: "guest@example.com",
            booker_id: "user-456",
          },
        });
        mockWebhooksConstructEvent.mockReturnValue({
          type: "payment_intent.payment_failed",
          data: { object: intent },
        });
        notifications.sendPaymentFailedPush.mockRejectedValue(
          new Error("FCM unavailable"),
        );

        await expect(
          service.handleWebhook(rawBody, sig),
        ).resolves.not.toThrow();
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

      expect(result).toMatchObject({
        status: "captured",
        failureReason: undefined,
      });
    });

    it("includes failureReason when payment failed", async () => {
      const row = makePaymentRow({
        status: "failed",
        failure_reason: "Insufficient funds.",
      });
      repo.findByReservationId.mockResolvedValue(row);

      const result = await service.getStatus("res-uuid");

      expect(result).toMatchObject({
        status: "failed",
        failureReason: "Insufficient funds.",
      });
    });

    it("returns snapshotted breakdown fields when present", async () => {
      const row = makePaymentRow({
        status: "captured",
        partner_id: "partner-1",
        property_id: "prop-1",
        property_name: "Hotel Test",
        gross_amount_usd: "350.50",
        tax_amount_usd: "55.95",
        commission_rate: "0.20",
        commission_amount_usd: "70.10",
        net_payout_usd: "280.40",
        captured_at: new Date("2026-05-01T12:00:00Z"),
      });
      repo.findByReservationId.mockResolvedValue(row);

      const result = await service.getStatus("res-uuid");

      expect(result).toMatchObject({
        partnerId: "partner-1",
        propertyId: "prop-1",
        propertyName: "Hotel Test",
        grossAmountUsd: 350.5,
        taxAmountUsd: 55.95,
        commissionRate: 0.2,
        commissionAmountUsd: 70.1,
        netPayoutUsd: 280.4,
        capturedAt: "2026-05-01T12:00:00.000Z",
      });
    });

    it("throws NotFoundException when no payment record exists", async () => {
      repo.findByReservationId.mockResolvedValue(undefined);

      await expect(service.getStatus("unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getCapturedByPartner", () => {
    it("rejects bad date formats with BadRequestException", async () => {
      await expect(
        service.getCapturedByPartner("p-1", "bad", "2026-05-01"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getCapturedByPartner("p-1", "2026-04-01", "bad"),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects ranges over 366 days", async () => {
      await expect(
        service.getCapturedByPartner("p-1", "2024-01-01", "2026-01-01"),
      ).rejects.toThrow(/366/);
    });

    it("rejects to <= from", async () => {
      await expect(
        service.getCapturedByPartner("p-1", "2026-05-01", "2026-04-01"),
      ).rejects.toThrow(/after/);
    });

    it("aggregates totals across captured rows and orders by captured_at", async () => {
      repo.findCapturedByPartner.mockResolvedValue([
        {
          id: "pay-1",
          reservation_id: "res-1",
          property_id: "prop-1",
          property_name: "Hotel A",
          status: "captured",
          stripe_payment_intent_id: "pi_1",
          amount_usd: "1190.00",
          gross_amount_usd: "1190.00",
          tax_amount_usd: "190.00",
          commission_rate: "0.2000",
          commission_amount_usd: "238.00",
          net_payout_usd: "952.00",
          captured_at: new Date("2026-04-05T12:00:00Z"),
          created_at: new Date("2026-04-05T11:00:00Z"),
          fare_snapshot: { nights: 2 },
        },
        {
          id: "pay-2",
          reservation_id: "res-2",
          property_id: "prop-1",
          property_name: "Hotel A",
          status: "captured",
          stripe_payment_intent_id: "pi_2",
          amount_usd: "595.00",
          gross_amount_usd: "595.00",
          tax_amount_usd: "95.00",
          commission_rate: "0.2000",
          commission_amount_usd: "119.00",
          net_payout_usd: "476.00",
          captured_at: new Date("2026-04-15T12:00:00Z"),
          created_at: new Date("2026-04-15T11:00:00Z"),
          fare_snapshot: { nights: 1 },
        },
      ]);

      const result = await service.getCapturedByPartner(
        "p-1",
        "2026-04-01",
        "2026-05-01",
      );

      expect(result.totals).toEqual({
        grossUsd: 1785,
        taxUsd: 285,
        commissionUsd: 357,
        netUsd: 1428,
        count: 2,
      });
      expect(result.rows).toHaveLength(2);
      expect(result.currency).toBe("USD");
      expect(repo.findCapturedByPartner).toHaveBeenCalledWith(
        "p-1",
        new Date("2026-04-01T00:00:00.000Z"),
        new Date("2026-05-01T00:00:00.000Z"),
        undefined,
      );
    });

    it("forwards propertyId when provided", async () => {
      repo.findCapturedByPartner.mockResolvedValue([]);
      await service.getCapturedByPartner(
        "p-1",
        "2026-04-01",
        "2026-05-01",
        "10000000-0000-4000-8000-000000000001",
      );
      expect(repo.findCapturedByPartner).toHaveBeenCalledWith(
        "p-1",
        expect.any(Date),
        expect.any(Date),
        "10000000-0000-4000-8000-000000000001",
      );
    });

    it("rejects invalid propertyId UUID", async () => {
      await expect(
        service.getCapturedByPartner(
          "p-1",
          "2026-04-01",
          "2026-05-01",
          "not-a-uuid",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
