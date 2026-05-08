import { EventsService } from "./events.service.js";
import type { BookingEvent } from "./types.js";

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
    reason: "overbooking",
    timestamp: "2026-05-07T00:00:00Z",
    ...overrides,
  };
}

describe("EventsService.handle", () => {
  let app: { sendNotification: jest.Mock };
  let service: EventsService;

  beforeEach(() => {
    app = { sendNotification: jest.fn() };
    service = new EventsService(app as any);
  });

  it("forwards a rendered partner-cancel message to AppService", async () => {
    await service.handle("booking.cancelled", makeEvent());

    expect(app.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "booker-1",
        to: "ana@example.com",
        channel: "email",
        subject: "Reserva cancelada",
        message: expect.stringContaining("overbooking"),
      }),
    );
  });

  it("does nothing when template returns null (guest cancel)", async () => {
    await service.handle("booking.cancelled", makeEvent({ actor: "guest" }));

    expect(app.sendNotification).not.toHaveBeenCalled();
  });

  it("does nothing for routing keys with silent templates (failed)", async () => {
    await service.handle(
      "booking.failed",
      makeEvent({ routingKey: "booking.failed", actor: "system" }),
    );

    expect(app.sendNotification).not.toHaveBeenCalled();
  });

  it("forwards confirmed event for partner actor", async () => {
    await service.handle(
      "booking.confirmed",
      makeEvent({ routingKey: "booking.confirmed", actor: "partner" }),
    );

    expect(app.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Reserva confirmada",
        message: expect.stringContaining("por el hotel"),
      }),
    );
  });
});
