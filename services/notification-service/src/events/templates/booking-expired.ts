import type { RenderedMessage } from "../types.js";

// No guest message fires on hold expiry today.
export function render(): RenderedMessage | null {
  return null;
}
