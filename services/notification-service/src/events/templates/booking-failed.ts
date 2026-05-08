import type { RenderedMessage } from "../types.js";

// No guest message fires on payment failure today (the retry flow handles UX).
export function render(): RenderedMessage | null {
  return null;
}
