import { BookingClient } from "./booking.client.js";
import { UpstreamServiceError } from "./upstream-service.error.js";

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

describe("BookingClient", () => {
  let client: BookingClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new BookingClient();
  });

  // ─── submitReservation ─────────────────────────────────────────────────────

  describe("submitReservation", () => {
    it("sends PATCH to /reservations/:id/submit", async () => {
      mockFetch.mockReturnValue(okResponse());

      await client.submitReservation("res-uuid");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/reservations/res-uuid/submit"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("throws UpstreamServiceError when the response is not ok", async () => {
      mockFetch.mockReturnValue(errorResponse(404));

      await expect(client.submitReservation("res-uuid")).rejects.toThrow(
        UpstreamServiceError,
      );
    });

    it("wraps network errors in UpstreamServiceError", async () => {
      mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

      const err = await client.submitReservation("res-uuid").catch((e) => e);

      expect(err).toBeInstanceOf(UpstreamServiceError);
      expect(err.service).toBe("booking-service");
    });

    it("does not double-wrap UpstreamServiceError", async () => {
      mockFetch.mockRejectedValue(
        new UpstreamServiceError("booking-service", "already wrapped"),
      );

      const err = await client.submitReservation("res-uuid").catch((e) => e);

      expect(err).toBeInstanceOf(UpstreamServiceError);
      // cause is the string, not another UpstreamServiceError
      expect(err.cause).toBe("already wrapped");
    });
  });

  // ─── reholdReservation ─────────────────────────────────────────────────────

  describe("reholdReservation", () => {
    it("sends PATCH to /reservations/:id/rehold", async () => {
      mockFetch.mockReturnValue(okResponse());

      await client.reholdReservation("res-uuid");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/reservations/res-uuid/rehold"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("throws UpstreamServiceError when the response is not ok", async () => {
      mockFetch.mockReturnValue(errorResponse(409));

      await expect(client.reholdReservation("res-uuid")).rejects.toThrow(
        UpstreamServiceError,
      );
    });
  });

  // ─── confirmReservation ────────────────────────────────────────────────────

  describe("confirmReservation", () => {
    it("sends PATCH to /reservations/:id/confirm", async () => {
      mockFetch.mockReturnValue(okResponse());

      await client.confirmReservation("res-uuid");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/reservations/res-uuid/confirm"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("throws UpstreamServiceError when the response is not ok", async () => {
      mockFetch.mockReturnValue(errorResponse(500));

      await expect(client.confirmReservation("res-uuid")).rejects.toThrow(
        UpstreamServiceError,
      );
    });
  });

  // ─── failReservation ───────────────────────────────────────────────────────

  describe("failReservation", () => {
    it("sends PATCH to /reservations/:id/fail with JSON body", async () => {
      mockFetch.mockReturnValue(okResponse());

      await client.failReservation("res-uuid", "Your card was declined.");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/reservations/res-uuid/fail"),
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({
            "content-type": "application/json",
          }),
          body: JSON.stringify({ reason: "Your card was declined." }),
        }),
      );
    });

    it("throws UpstreamServiceError when the response is not ok", async () => {
      mockFetch.mockReturnValue(errorResponse(422));

      await expect(
        client.failReservation("res-uuid", "Insufficient funds."),
      ).rejects.toThrow(UpstreamServiceError);
    });
  });
});
