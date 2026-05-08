import { render } from "./booking-confirmed.js";
import type { BookingEvent } from "../types.js";

function makeEvent(overrides: Partial<BookingEvent> = {}): BookingEvent {
  return {
    routingKey: "booking.confirmed",
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
    actor: "system",
    timestamp: "2026-05-07T00:00:00Z",
    ...overrides,
  };
}

describe("booking-confirmed template", () => {
  it("renders 'confirmada' subject for system actor", () => {
    const result = render(makeEvent({ actor: "system" }));
    expect(result?.subject).toBe("Reserva confirmada");
    expect(result?.body).toContain("ha sido confirmada");
    expect(result?.body).not.toContain("por el hotel");
  });

  it("renders 'confirmada por el hotel' for partner actor", () => {
    const result = render(makeEvent({ actor: "partner" }));
    expect(result?.body).toContain("confirmada por el hotel");
  });

  it("returns null when guest has no email", () => {
    expect(render(makeEvent({ guestInfo: null }))).toBeNull();
  });
});
