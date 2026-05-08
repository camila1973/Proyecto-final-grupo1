import type { RenderedMessage } from "../types.js";

// No guest message fires on check-in today.
export function render(): RenderedMessage | null {
  return null;
}
