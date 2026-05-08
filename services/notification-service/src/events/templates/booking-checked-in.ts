import type { BookingEvent, RenderedMessage } from "../types.js";

// No guest message fires on check-in today.
export function render(_event: BookingEvent): RenderedMessage | null {
  return null;
}
