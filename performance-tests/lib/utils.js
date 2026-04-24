import { sleep } from "k6";
import { DATE_RANGE_START, DATE_RANGE_END } from "../fixtures/seed-data.js";

export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Returns { checkIn, checkOut } as YYYY-MM-DD strings within the seeded price period range.
// minNights/maxNights control the stay length (default 3–14 nights).
export function randomDatePair(minNights = 3, maxNights = 14) {
  const start = new Date(DATE_RANGE_START).getTime();
  const end   = new Date(DATE_RANGE_END).getTime();
  const nights = minNights + Math.floor(Math.random() * (maxNights - minNights + 1));

  // Pick a checkIn that leaves room for at least `nights` before DATE_RANGE_END
  const latestCheckIn = end - nights * 86_400_000;
  const checkInMs = start + Math.floor(Math.random() * (latestCheckIn - start));
  const checkOutMs = checkInMs + nights * 86_400_000;

  return {
    checkIn:  toDateString(checkInMs),
    checkOut: toDateString(checkOutMs),
  };
}

// Sleeps for baseMs + random spread, simulating real user think time.
export function jitter(baseMs, spreadMs) {
  sleep((baseMs + Math.random() * spreadMs) / 1000);
}

function toDateString(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}
