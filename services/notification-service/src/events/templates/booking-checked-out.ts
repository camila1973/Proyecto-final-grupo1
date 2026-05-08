import type { BookingEvent, RenderedMessage } from "../types.js";

function guestFirstName(event: BookingEvent): string {
  return event.guestInfo?.firstName?.trim() || "huésped";
}

export function render(event: BookingEvent): RenderedMessage | null {
  const to = event.guestInfo?.email;
  if (!to) return null;

  return {
    channel: "email",
    to,
    subject: "Check-out completado",
    body: `Hola ${guestFirstName(event)}, tu check-out ha sido completado. ¡Gracias por tu estadía!`,
  };
}
