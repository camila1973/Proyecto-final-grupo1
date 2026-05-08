import { render } from "./booking-cancelled.js";
import type { BookingEvent } from "../types.js";

function makeEvent(overrides: Partial<BookingEvent> = {}): BookingEvent {
  return {
    routingKey: "booking.cancelled",
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
    timestamp: "2026-05-07T00:00:00Z",
    ...overrides,
  };
}

describe("booking-cancelled template", () => {
  it("returns email message when partner cancels", () => {
    const result = render(makeEvent({ reason: "overbooking" }));

    expect(result).toEqual({
      channel: "email",
      to: "ana@example.com",
      subject: "Reserva cancelada",
      body: expect.stringContaining("overbooking"),
    });
    expect(result?.body).toContain("Ana");
    expect(result?.body).toContain("cancelada por el hotel");
  });

  it("returns null when guest cancels", () => {
    expect(render(makeEvent({ actor: "guest" }))).toBeNull();
  });

  it("returns null when system cancels", () => {
    expect(render(makeEvent({ actor: "system" }))).toBeNull();
  });

  it("returns null when guest has no email", () => {
    expect(render(makeEvent({ guestInfo: null }))).toBeNull();
  });

  it("falls back to 'no especificado' when reason is missing", () => {
    const result = render(makeEvent({ reason: undefined }));
    expect(result?.body).toContain("no especificado");
  });

  it("falls back to 'huésped' when firstName is empty", () => {
    const result = render(
      makeEvent({
        guestInfo: { firstName: "  ", lastName: "X", email: "x@y.com" },
        reason: "x",
      }),
    );
    expect(result?.body).toContain("huésped");
  });
});
