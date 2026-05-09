type Handler = () => void;

let onUnauthorized: Handler | null = null;

export function setOnUnauthorizedHandler(fn: Handler | null): void {
  onUnauthorized = fn;
}

export function triggerOnUnauthorized(): void {
  onUnauthorized?.();
}
