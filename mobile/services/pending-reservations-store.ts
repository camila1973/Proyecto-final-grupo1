let _hasPending = false;
const listeners = new Set<() => void>();

export function setPendingReservation(value: boolean): void {
  if (_hasPending === value) return;
  _hasPending = value;
  listeners.forEach((fn) => fn());
}

export function getPendingReservation(): boolean {
  return _hasPending;
}

export function subscribePendingReservation(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
