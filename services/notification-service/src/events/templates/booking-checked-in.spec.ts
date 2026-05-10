import { render } from "./booking-checked-in.js";
import type { BookingEvent } from "../types.js";

function makeEvent(overrides: Partial<BookingEvent> = {}): BookingEvent {
  return {
    routingKey: "booking.checked_in",
    reservationId: "res-1",
    partnerId: "partner-1",
    propertyId: "prop-1",
    roomId: "room-1",
    bookerId: "booker-1",
    guestInfo: {
      firstName: "Ana",
      lastName: "García",
      email: "ana@example.com",
    },
    checkIn: "2026-05-01",
    checkOut: "2026-05-04",
    actor: "partner",
    timestamp: "2026-05-01T14:00:00Z",
    ...overrides,
  };
}

describe("booking-checked-in template", () => {
  it("sends a welcome email to the guest with their first name", () => {
    const result = render(makeEvent());

    expect(result).toEqual({
      channel: "email",
      to: "ana@example.com",
      subject: expect.stringContaining("check-in"),
      body: expect.stringContaining("Ana"),
    });
  });

  it("targets the guest's email address", () => {
    const result = render(makeEvent());
    expect(result?.to).toBe("ana@example.com");
  });

  it("returns null when guestInfo is null (no email to send to)", () => {
    expect(render(makeEvent({ guestInfo: null }))).toBeNull();
  });

  it("uses 'huésped' as fallback when firstName is missing", () => {
    const result = render(
      makeEvent({
        guestInfo: {
          firstName: "",
          lastName: "García",
          email: "ana@example.com",
        },
      }),
    );
    expect(result?.body).toContain("huésped");
  });

  it("fires for both guest and partner actors", () => {
    expect(render(makeEvent({ actor: "guest" }))).not.toBeNull();
    expect(render(makeEvent({ actor: "partner" }))).not.toBeNull();
  });
});
