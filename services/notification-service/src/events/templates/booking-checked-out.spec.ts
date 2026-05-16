import { render } from "./booking-checked-out.js";
import type { BookingEvent } from "../types.js";

function makeEvent(overrides: Partial<BookingEvent> = {}): BookingEvent {
  return {
    routingKey: "booking.checked_out",
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
    actor: "guest",
    timestamp: "2026-05-07T00:00:00Z",
    ...overrides,
  };
}

describe("booking-checked-out template", () => {
  it("renders thanks message for the guest", () => {
    const result = render(makeEvent());
    expect(result).toEqual({
      channel: "email",
      to: "ana@example.com",
      subject: "Check-out completado",
      body: expect.stringContaining("Ana"),
    });
    expect(result?.body).toContain("Gracias");
  });

  it("returns null when guest has no email", () => {
    expect(render(makeEvent({ guestInfo: null }))).toBeNull();
  });

  it("falls back to 'huésped' when firstName is empty/whitespace", () => {
    const result = render(
      makeEvent({
        guestInfo: {
          firstName: "   ",
          lastName: "García",
          email: "ana@example.com",
        },
      }),
    );
    expect(result?.body).toContain("huésped");
    expect(result?.body).not.toContain("Ana");
  });
});
