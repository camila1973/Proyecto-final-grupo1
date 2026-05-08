import type { BookingEvent, RenderedMessage } from "../types.js";

// No guest message fires on payment failure today (the retry flow handles UX).
export function render(_event: BookingEvent): RenderedMessage | null {
  return null;
}
