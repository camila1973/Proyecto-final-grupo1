import { render as checkedIn } from "./booking-checked-in.js";
import { render as failed } from "./booking-failed.js";
import { render as expired } from "./booking-expired.js";
import type { BookingEvent } from "../types.js";

function makeEvent(routingKey: BookingEvent["routingKey"]): BookingEvent {
  return {
    routingKey,
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
  };
}

describe("silent templates", () => {
  it("checked-in now sends an email (no longer silent)", () => {
    expect(checkedIn(makeEvent("booking.checked_in"))).not.toBeNull();
  });

  it("failed returns null", () => {
    expect(failed(makeEvent("booking.failed"))).toBeNull();
  });

  it("expired returns null", () => {
    expect(expired(makeEvent("booking.expired"))).toBeNull();
  });
});
