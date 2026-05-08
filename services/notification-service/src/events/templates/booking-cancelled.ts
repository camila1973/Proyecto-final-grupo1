import type { BookingEvent, RenderedMessage } from "../types.js";

function guestFirstName(event: BookingEvent): string {
  return event.guestInfo?.firstName?.trim() || "huésped";
}

export function render(event: BookingEvent): RenderedMessage | null {
  if (event.actor !== "partner") return null;

  const to = event.guestInfo?.email;
  if (!to) return null;

  const reason = event.reason ?? "no especificado";
  return {
    channel: "email",
    to,
    subject: "Reserva cancelada",
    body: `Hola ${guestFirstName(event)}, tu reserva ha sido cancelada por el hotel. Motivo: ${reason}.`,
  };
}
