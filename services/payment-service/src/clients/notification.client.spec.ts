import { NotificationClient } from "./notification.client.js";

// ─── fetch mock ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function okResponse() {
  return Promise.resolve({ ok: true, status: 200 } as Response);
}

function errorResponse(status = 500) {
  return Promise.resolve({ ok: false, status } as Response);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("NotificationClient", () => {
  let client: NotificationClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new NotificationClient();
  });

  // ─── sendPaymentSucceeded ──────────────────────────────────────────────────

  describe("sendPaymentSucceeded", () => {
    it("posts to /notifications/send with correct fields", async () => {
      mockFetch.mockReturnValue(okResponse());

      await client.sendPaymentSucceeded({
        to: "guest@example.com",
        reservationId: "res-uuid",
        amountUsd: 350.5,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/notifications/send"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "content-type": "application/json",
          }),
        }),
      );

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.to).toBe("guest@example.com");
      expect(body.userId).toBe("res-uuid");
      expect(body.channel).toBe("email");
      expect(body.message).toContain("350.50");
    });

    it("does not throw when notification-service returns non-200", async () => {
      mockFetch.mockReturnValue(errorResponse(503));

      await expect(
        client.sendPaymentSucceeded({
          to: "guest@example.com",
          reservationId: "res-uuid",
          amountUsd: 100,
        }),
      ).resolves.not.toThrow();
    });

    it("does not throw when fetch rejects (network error)", async () => {
      mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(
        client.sendPaymentSucceeded({
          to: "guest@example.com",
          reservationId: "res-uuid",
          amountUsd: 100,
        }),
      ).resolves.not.toThrow();
    });
  });

  // ─── sendPaymentFailed ─────────────────────────────────────────────────────

  describe("sendPaymentFailed", () => {
    it("posts to /notifications/send with reason in body", async () => {
      mockFetch.mockReturnValue(okResponse());

      await client.sendPaymentFailed({
        to: "guest@example.com",
        reservationId: "res-uuid",
        reason: "Insufficient funds.",
      });

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.to).toBe("guest@example.com");
      expect(body.userId).toBe("res-uuid");
      expect(body.channel).toBe("email");
      expect(body.message).toContain("Insufficient funds.");
    });

    it("does not throw when notification-service is unavailable", async () => {
      mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(
        client.sendPaymentFailed({
          to: "guest@example.com",
          reservationId: "res-uuid",
          reason: "Card declined.",
        }),
      ).resolves.not.toThrow();
    });
  });

  // ─── sendRefundIssued ──────────────────────────────────────────────────────

  describe("sendRefundIssued", () => {
    it("emails the guest with the refund amount, comprobante and ETA", async () => {
      mockFetch.mockReturnValue(okResponse());

      await client.sendRefundIssued({
        to: "guest@example.com",
        reservationId: "res-uuid",
        refundedUsd: 175.25,
        policy: "partial_refund",
        refundExternalRef: "re_test_xyz",
      });

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.to).toBe("guest@example.com");
      expect(body.userId).toBe("res-uuid");
      expect(body.channel).toBe("email");
      expect(body.message).toContain("175.25");
      expect(body.message).toContain("re_test_xyz");
      expect(body.message).toMatch(/d[ií]as h[áa]biles/);
      expect(body.html).toContain("Reembolso parcial");
    });

    it("uses the full-refund label when policy is full_refund", async () => {
      mockFetch.mockReturnValue(okResponse());

      await client.sendRefundIssued({
        to: "guest@example.com",
        reservationId: "res-uuid",
        refundedUsd: 350.5,
        policy: "full_refund",
        refundExternalRef: "re_full",
      });

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.html).toContain("Reembolso total");
    });

    it("does not throw when notification-service is unavailable", async () => {
      mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(
        client.sendRefundIssued({
          to: "guest@example.com",
          reservationId: "res-uuid",
          refundedUsd: 100,
          policy: "full_refund",
          refundExternalRef: "re_x",
        }),
      ).resolves.not.toThrow();
    });
  });

  // ─── sendRefundFailedAlert ─────────────────────────────────────────────────

  describe("sendRefundFailedAlert", () => {
    it("routes to the customer-support inbox with actor metadata", async () => {
      mockFetch.mockReturnValue(okResponse());

      await client.sendRefundFailedAlert({
        reservationId: "res-uuid",
        paymentIntentId: "pi_test_abc",
        attemptedUsd: 350.5,
        failureReason: "card_not_refundable",
        actorId: "user-7",
        actorRole: "guest",
      });

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.userId).toBe("customer-support");
      expect(body.subject).toContain("ALERTA");
      expect(body.message).toContain("pi_test_abc");
      expect(body.message).toContain("card_not_refundable");
      expect(body.html).toContain("user-7");
    });

    it("respects CUSTOMER_SUPPORT_EMAIL when configured", async () => {
      const prev = process.env.CUSTOMER_SUPPORT_EMAIL;
      process.env.CUSTOMER_SUPPORT_EMAIL = "ops@example.com";
      const overrideClient = new NotificationClient();
      mockFetch.mockReturnValue(okResponse());

      await overrideClient.sendRefundFailedAlert({
        reservationId: "res-uuid",
        paymentIntentId: "pi_x",
        attemptedUsd: 10,
        failureReason: "boom",
        actorId: null,
        actorRole: null,
      });

      const body = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string,
      );
      expect(body.to).toBe("ops@example.com");

      if (prev !== undefined) {
        process.env.CUSTOMER_SUPPORT_EMAIL = prev;
      } else {
        delete process.env.CUSTOMER_SUPPORT_EMAIL;
      }
    });

    it("does not throw when notification-service is unavailable", async () => {
      mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(
        client.sendRefundFailedAlert({
          reservationId: "res-uuid",
          paymentIntentId: "pi_x",
          attemptedUsd: 10,
          failureReason: "boom",
          actorId: null,
          actorRole: null,
        }),
      ).resolves.not.toThrow();
    });
  });
});
