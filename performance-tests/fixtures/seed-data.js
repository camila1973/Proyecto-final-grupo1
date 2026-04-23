// Mirrors UUIDs from services/search-service/scripts/seed.ts
// Keep in sync if seed data changes.

export const CITIES = ["Cancún", "Ciudad de México"];

export const CITY_PREFIXES = ["can", "cdm", "gua", "mex", "pl"];

// All room_price_periods cover 2027-01-01 → 2027-12-31.
// Test dates MUST stay within this range.
export const DATE_RANGE_START = "2027-01-01";
export const DATE_RANGE_END   = "2027-12-31";

export const PROPERTY_IDS = [
  "b1000000-0000-0000-0000-000000000001", // Gran Caribe Resort & Spa, Cancún 5★
  "b1000000-0000-0000-0000-000000000002", // Playa Azul Hotel, Cancún 4★
  "b1000000-0000-0000-0000-000000000003", // Hostal Sol Cancún 3★
  "b1000000-0000-0000-0000-000000000004", // Hotel Histórico Centro, CDMX 5★
  "b1000000-0000-0000-0000-000000000005", // Condesa Inn, CDMX 4★
];

// ─── Booking smoke test fixtures ──────────────────────────────────────────────
// Mirrors booking-service/scripts/seed.ts and inventory-service/scripts/seed.ts.
// BOOKING_ROOM_ID uses ROOM(3) — Gran Caribe Superior Double — which has no
// seed reservations, so smoke test dates (2028+) will never conflict.

export const BOOKING_BOOKER_ID   = "e1000000-0000-0000-0000-000000000001";
export const BOOKING_ROOM_ID     = "c1000000-0000-0000-0000-000000000003"; // Gran Caribe Superior Double
export const BOOKING_PROPERTY_ID = "b1000000-0000-0000-0000-000000000001"; // Gran Caribe Resort & Spa
export const BOOKING_PARTNER_ID  = "a1000000-0000-0000-0000-000000000001";
