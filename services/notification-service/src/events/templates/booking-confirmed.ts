import type { BookingEvent, RenderedMessage } from "../types.js";

function guestFirstName(event: BookingEvent): string {
  return event.guestInfo?.firstName?.trim() || "huésped";
}

export function render(event: BookingEvent): RenderedMessage | null {
  const to = event.guestInfo?.email;
  if (!to) return null;

  const body =
    event.actor === "partner"
      ? `Hola ${guestFirstName(event)}, tu reserva ha sido confirmada por el hotel.`
      : `Hola ${guestFirstName(event)}, tu reserva ha sido confirmada.`;

  return {
    channel: "email",
    to,
    subject: "Reserva confirmada",
    body,
  };
}
