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
    subject: "¡Bienvenido! Tu check-in ha sido registrado",
    body: `Hola ${guestFirstName(event)}, tu check-in fue registrado exitosamente. ¡Que disfrutes tu estadía!`,
  };
}
