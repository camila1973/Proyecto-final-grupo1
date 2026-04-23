/**
 * TravelHub — Booking Smoke Tests
 *
 * Validates functional correctness of the provisional cart flow:
 *   POST /holds → POST /reservations → PATCH /confirm
 *   + idempotency, double-submit, bad holdId, explicit release
 *
 * Each of the 5 scenarios runs exactly once (1 VU × 5 iterations, cycled by __ITER).
 * Dates are in 2027 — within the seeded rate range (2027-01-01 → 2027-12-31).
 *
 * Usage:
 *   GATEWAY_URL=http://localhost:3000 k6 run scenarios/smoke/booking.js
 *   npm run test:smoke:booking
 *
 * Requires: booking-service + inventory-service + Redis running and seeded.
 */

import { check } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { post, patch, del } from "../../lib/http.js";
import { jitter } from "../../lib/utils.js";
import {
  BOOKING_BOOKER_ID,
  BOOKING_ROOM_ID,
  BOOKING_PROPERTY_ID,
  BOOKING_PARTNER_ID,
} from "../../fixtures/seed-data.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const GATEWAY_URL = __ENV.GATEWAY_URL;
if (!GATEWAY_URL) {
  throw new Error(
    'GATEWAY_URL env var is required. Example: GATEWAY_URL=http://localhost:3000 k6 run scenarios/smoke/booking.js'
  );
}

const BOOKING = `${GATEWAY_URL}/api/booking`;

// ─── Options ─────────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    booking: {
      executor: "per-vu-iterations",
      vus: 1,
      iterations: 5,      // one pass per scenario type
      maxDuration: "5m",
    },
  },
  thresholds: {
    // All checks must pass at 100% — any unexpected status surfaced here.
    // http_req_failed is intentionally omitted: bad_hold_id (401) and
    // release (404) are expected error paths that would inflate the rate.
    checks: ["rate>=1"],
  },
  tags: {
    environment: "production",
    project: "travelhub",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Each VU+iteration gets a unique 3-night window within the seeded rate
// range (2027-01-01 → 2027-12-31). ROOM(3) has no seed reservations so any
// 2027 date is safe. Slots are 14 days apart to prevent overlap between
// concurrent VUs: slot = (ITER + (VU-1) * 10) * 14 days.
function datePair() {
  const base  = new Date("2027-01-01").getTime();
  const slot  = (__ITER + (__VU - 1) * 10) * 14 * 86_400_000;
  const inMs  = base + slot;
  const outMs = inMs + 3 * 86_400_000;
  return {
    checkIn:  new Date(inMs).toISOString().slice(0, 10),
    checkOut: new Date(outMs).toISOString().slice(0, 10),
  };
}

function placeHold(checkIn, checkOut) {
  return post(
    `${BOOKING}/holds`,
    { bookerId: BOOKING_BOOKER_ID, roomId: BOOKING_ROOM_ID, checkIn, checkOut },
    { name: "place_hold" },
  );
}

function createReservation(holdId, checkIn, checkOut) {
  return post(
    `${BOOKING}/reservations`,
    {
      holdId,
      propertyId: BOOKING_PROPERTY_ID,
      roomId:     BOOKING_ROOM_ID,
      partnerId:  BOOKING_PARTNER_ID,
      bookerId:   BOOKING_BOOKER_ID,
      guestInfo:  { firstName: "Smoke", lastName: "Test", email: "smoke@travelhub.com" },
      checkIn,
      checkOut,
    },
    { name: "create_reservation" },
  );
}

function confirmReservation(id) {
  return patch(`${BOOKING}/reservations/${id}/confirm`, null, { name: "confirm_reservation" });
}

// ─── Scenarios ────────────────────────────────────────────────────────────────

/**
 * 0 — Happy path
 * Full flow: hold → reserve → confirm.
 * Verifies HTTP statuses and response shape at each step.
 */
function happyPath() {
  const { checkIn, checkOut } = datePair();

  const holdRes = placeHold(checkIn, checkOut);
  const holdOk = check(holdRes, {
    "happy_path: hold 201":          (r) => r.status === 201,
    "happy_path: holdId present":    (r) => { try { return !!JSON.parse(r.body).holdId; } catch { return false; } },
    "happy_path: expiresAt present": (r) => { try { return !!JSON.parse(r.body).expiresAt; } catch { return false; } },
  });
  if (!holdOk || holdRes.status !== 201) return;
  const { holdId } = JSON.parse(holdRes.body);

  const resRes = createReservation(holdId, checkIn, checkOut);
  const resOk = check(resRes, {
    "happy_path: reservation 201":          (r) => r.status === 201,
    "happy_path: fareBreakdown present":    (r) => { try { return !!JSON.parse(r.body).fareBreakdown; } catch { return false; } },
    "happy_path: holdExpiresAt present":    (r) => { try { return !!JSON.parse(r.body).holdExpiresAt; } catch { return false; } },
  });
  if (!resOk || resRes.status !== 201) return;
  const { id } = JSON.parse(resRes.body);

  const confirmRes = confirmReservation(id);
  check(confirmRes, {
    "happy_path: confirm 200":      (r) => r.status === 200,
    "happy_path: status confirmed": (r) => { try { return JSON.parse(r.body).status === "confirmed"; } catch { return false; } },
  });
}

/**
 * 1 — Idempotency (double-click on "Select Room")
 * Two POST /holds with the same params must return the same holdId.
 * inventory held_rooms must not be double-incremented.
 * Releases the hold at the end to keep inventory clean.
 */
function idempotency() {
  const { checkIn, checkOut } = datePair();

  const r1 = placeHold(checkIn, checkOut);
  check(r1, { "idempotency: 1st hold 201": (r) => r.status === 201 });
  if (r1.status !== 201) return;
  const holdId1 = JSON.parse(r1.body).holdId;

  const r2 = placeHold(checkIn, checkOut); // identical params
  const holdId2 = r2.status < 300 ? JSON.parse(r2.body).holdId : null;
  check(r2, {
    "idempotency: 2nd hold is 2xx":         (r) => r.status >= 200 && r.status < 300,
    "idempotency: same holdId returned":    () => holdId1 === holdId2,
  });

  // Cleanup — release hold so inventory held_rooms returns to 0
  del(`${BOOKING}/holds/${holdId1}`, { name: "release_hold" });
}

/**
 * 2 — Double-submit protection
 * Two POST /reservations with the same holdId: first succeeds (201),
 * second is rejected (410 Gone) — GETDEL atomicity ensures one winner.
 */
function doubleSubmit() {
  const { checkIn, checkOut } = datePair();

  const holdRes = placeHold(checkIn, checkOut);
  if (holdRes.status !== 201) return;
  const { holdId } = JSON.parse(holdRes.body);

  const r1 = createReservation(holdId, checkIn, checkOut);
  check(r1, { "double_submit: 1st reservation 201": (r) => r.status === 201 });
  if (r1.status !== 201) return;
  const { id } = JSON.parse(r1.body);

  const r2 = createReservation(holdId, checkIn, checkOut); // same holdId, hold already consumed
  check(r2, { "double_submit: 2nd reservation 410": (r) => r.status === 410 });

  // Cleanup
  confirmReservation(id);
}

/**
 * 3 — Bad holdId
 * POST /reservations with a holdId that doesn't match the Redis payload
 * must be rejected with 401 Unauthorized.
 * Releases the real hold at the end.
 */
function badHoldId() {
  const { checkIn, checkOut } = datePair();

  const holdRes = placeHold(checkIn, checkOut);
  if (holdRes.status !== 201) return;
  const { holdId } = JSON.parse(holdRes.body);

  const r = createReservation(
    "00000000-0000-0000-0000-000000000000", // wrong holdId
    checkIn,
    checkOut,
  );
  check(r, { "bad_hold_id: 401 Unauthorized": (r) => r.status === 401 });

  // Cleanup — Redis idempotency key is still alive (GETDEL reads the key
  // before validating the holdId mismatch, so the key is consumed).
  // Nothing to release — the hold in inventory is still active but the
  // idempotency key is gone. Release via by-id key.
  del(`${BOOKING}/holds/${holdId}`, { name: "release_hold" });
}

/**
 * 4 — Explicit release
 * DELETE /holds/:holdId returns 204 on the first call.
 * A second DELETE on the same holdId returns 404 (already released).
 */
function releaseHold() {
  const { checkIn, checkOut } = datePair();

  const holdRes = placeHold(checkIn, checkOut);
  check(holdRes, { "release: hold 201": (r) => r.status === 201 });
  if (holdRes.status !== 201) return;
  const { holdId } = JSON.parse(holdRes.body);

  const r1 = del(`${BOOKING}/holds/${holdId}`, { name: "release_hold" });
  check(r1, { "release: DELETE 204": (r) => r.status === 204 });

  const r2 = del(`${BOOKING}/holds/${holdId}`, { name: "release_hold" });
  check(r2, { "release: 2nd DELETE 404": (r) => r.status === 404 });
}

// ─── VU loop ─────────────────────────────────────────────────────────────────

const SCENARIOS = [happyPath, idempotency, doubleSubmit, badHoldId, releaseHold];

export default function () {
  SCENARIOS[__ITER % SCENARIOS.length]();
  jitter(300, 700); // 0.3–1s think time between iterations
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  return {
    "results/summary-booking.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
