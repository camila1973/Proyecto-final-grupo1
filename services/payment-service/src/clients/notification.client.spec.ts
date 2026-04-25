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
});
