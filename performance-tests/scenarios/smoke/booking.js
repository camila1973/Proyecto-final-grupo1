/**
 * TravelHub — Booking Smoke Tests
 *
 * Validates functional correctness of the reservation flow:
 *   POST /reservations (held) → PATCH /submit (submitted) → PATCH /confirm (confirmed)
 *   + idempotency (same booker/room/dates returns existing held), double-submit guard,
 *     guest-info update, cancel from held/submitted, fail + rehold retry path.
 *
 * Each of the 8 scenarios runs exactly once (1 VU × 8 iterations, cycled by __ITER).
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
import { post, patch, get } from "../../lib/http.js";
import { login } from "../../lib/auth.js";
import { jitter } from "../../lib/utils.js";
import {
  BOOKING_BOOKER_ID,
  BOOKING_ROOM_ID,
  BOOKING_PROPERTY_ID,
  BOOKING_PARTNER_ID,
} from "../../fixtures/seed-data.js";

// Seeded MFA-bypass account (services/auth-service/scripts/seed.ts).
// All PATCH /reservations/* endpoints require a valid JWT at the gateway.
const E2E_EMAIL    = __ENV.E2E_EMAIL    || "e2e@travelhub.com";
const E2E_PASSWORD = __ENV.E2E_PASSWORD || "E2eTest1234!";

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
      iterations: 8,      // one pass per scenario type
      maxDuration: "5m",
    },
  },
  thresholds: {
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

function createReservation(checkIn, checkOut, token) {
  return post(
    `${BOOKING}/reservations`,
    {
      propertyId: BOOKING_PROPERTY_ID,
      roomId:     BOOKING_ROOM_ID,
      partnerId:  BOOKING_PARTNER_ID,
      bookerId:   BOOKING_BOOKER_ID,
      checkIn,
      checkOut,
    },
    { name: "create_reservation" },
    token,
  );
}

function submitReservation(id, token) {
  return patch(`${BOOKING}/reservations/${id}/submit`, null, { name: "submit_reservation" }, token);
}

function confirmReservation(id, token) {
  return patch(`${BOOKING}/reservations/${id}/confirm`, null, { name: "confirm_reservation" }, token);
}

function getReservation(id, token) {
  return get(`${BOOKING}/reservations/${id}`, { name: "get_reservation" }, token);
}

function updateGuestInfo(id, token) {
  return patch(
    `${BOOKING}/reservations/${id}/guest-info`,
    { firstName: "Smoke", lastName: "Test", email: "smoke@travelhub.com", phone: "+52 555 000 0000" },
    { name: "update_guest_info" },
    token,
  );
}

function failReservation(id, token) {
  return patch(
    `${BOOKING}/reservations/${id}/fail`,
    { reason: "Your card was declined." },
    { name: "fail_reservation" },
    token,
  );
}

function cancelReservation(id, token) {
  return patch(
    `${BOOKING}/reservations/${id}/cancel`,
    { reason: "Smoke test cancellation" },
    { name: "cancel_reservation" },
    token,
  );
}

function reholdReservation(id, token) {
  return patch(`${BOOKING}/reservations/${id}/rehold`, null, { name: "rehold_reservation" }, token);
}

// ─── Scenarios ────────────────────────────────────────────────────────────────

/**
 * 0 — Happy path
 * Full flow: create (held) → guest-info → submit (submitted) → confirm (confirmed).
 * Verifies HTTP statuses and response shape at each step.
 */
function happyPath(token) {
  const { checkIn, checkOut } = datePair();

  const resRes = createReservation(checkIn, checkOut, token);
  const resOk = check(resRes, {
    "happy_path: reservation 201":       (r) => r.status === 201,
    "happy_path: status held":            (r) => { try { return JSON.parse(r.body).status === "held"; } catch { return false; } },
    "happy_path: fareBreakdown present": (r) => { try { return !!JSON.parse(r.body).fareBreakdown; } catch { return false; } },
    "happy_path: holdExpiresAt present": (r) => { try { return !!JSON.parse(r.body).holdExpiresAt; } catch { return false; } },
  });
  if (!resOk || resRes.status !== 201) return;
  const { id } = JSON.parse(resRes.body);

  const patchRes = updateGuestInfo(id, token);
  check(patchRes, {
    "happy_path: guest-info 200": (r) => r.status === 200,
  });

  const submitRes = submitReservation(id, token);
  check(submitRes, {
    "happy_path: submit 200":       (r) => r.status === 200,
    "happy_path: status submitted":  (r) => { try { return JSON.parse(r.body).status === "submitted"; } catch { return false; } },
  });

  const confirmRes = confirmReservation(id, token);
  check(confirmRes, {
    "happy_path: confirm 200":      (r) => r.status === 200,
    "happy_path: status confirmed": (r) => { try { return JSON.parse(r.body).status === "confirmed"; } catch { return false; } },
  });
}

/**
 * 1 — Idempotency (double-click on "Book")
 * Two POST /reservations with the same booker/room/dates return the same reservation ID.
 * The partial unique index on held prevents duplicate active holds.
 */
function idempotency(token) {
  const { checkIn, checkOut } = datePair();

  const r1 = createReservation(checkIn, checkOut, token);
  check(r1, { "idempotency: 1st reservation 201": (r) => r.status === 201 });
  if (r1.status !== 201) return;
  const id1 = JSON.parse(r1.body).id;

  const r2 = createReservation(checkIn, checkOut, token); // identical params
  const id2 = (r2.status === 200 || r2.status === 201) ? JSON.parse(r2.body).id : null;
  check(r2, {
    "idempotency: 2nd call is 2xx":       (r) => r.status >= 200 && r.status < 300,
    "idempotency: same reservation id":   () => id1 === id2,
  });

  // Cleanup — confirm so the held is released
  submitReservation(id1, token);
  confirmReservation(id1, token);
}

/**
 * 2 — Get reservation
 * Creates a reservation and fetches it by ID.
 * Verifies the response shape and status.
 */
function getReservationScenario(token) {
  const { checkIn, checkOut } = datePair();

  const resRes = createReservation(checkIn, checkOut, token);
  if (resRes.status !== 201) return;
  const { id } = JSON.parse(resRes.body);

  const getRes = getReservation(id, token);
  check(getRes, {
    "get_reservation: 200":              (r) => r.status === 200,
    "get_reservation: id matches":       (r) => { try { return JSON.parse(r.body).id === id; } catch { return false; } },
    "get_reservation: status held":       (r) => { try { return JSON.parse(r.body).status === "held"; } catch { return false; } },
  });

  // Cleanup
  submitReservation(id, token);
  confirmReservation(id, token);
}

/**
 * 3 — Submit without prior held (idempotency guard)
 * Submitting an already-submitted or confirmed reservation returns 404.
 */
function submitAlreadyPending(token) {
  const { checkIn, checkOut } = datePair();

  const resRes = createReservation(checkIn, checkOut, token);
  if (resRes.status !== 201) return;
  const { id } = JSON.parse(resRes.body);

  // First submit: ok
  const s1 = submitReservation(id, token);
  check(s1, { "double_submit: 1st submit 200": (r) => r.status === 200 });

  // Second submit on already-submitted: rejected (404 — not held anymore)
  const s2 = submitReservation(id, token);
  check(s2, { "double_submit: 2nd submit rejected": (r) => r.status === 404 || r.status === 409 || r.status === 400 });

  // Cleanup
  confirmReservation(id, token);
}

/**
 * 4 — Full lifecycle check
 * Creates, submits, confirms and verifies final state via GET.
 */
function fullLifecycle(token) {
  const { checkIn, checkOut } = datePair();

  const resRes = createReservation(checkIn, checkOut, token);
  if (resRes.status !== 201) return;
  const { id } = JSON.parse(resRes.body);

  submitReservation(id, token);
  confirmReservation(id, token);

  const getRes = getReservation(id, token);
  check(getRes, {
    "lifecycle: final status confirmed": (r) => { try { return JSON.parse(r.body).status === "confirmed"; } catch { return false; } },
  });
}

/**
 * 5 — Cancel from held
 * Creates a reservation and cancels it immediately (held → cancelled).
 * Verifies the reservation reaches the cancelled state and the inventory hold
 * is released (subsequent create on the same dates should succeed).
 */
function cancelHeld(token) {
  const { checkIn, checkOut } = datePair();

  const resRes = createReservation(checkIn, checkOut, token);
  check(resRes, { "cancel_held: reservation 201": (r) => r.status === 201 });
  if (resRes.status !== 201) return;
  const { id } = JSON.parse(resRes.body);

  const cancelRes = cancelReservation(id, token);
  check(cancelRes, {
    "cancel_held: cancel 200":         (r) => r.status === 200,
    "cancel_held: status cancelled":   (r) => { try { return JSON.parse(r.body).status === "cancelled"; } catch { return false; } },
    "cancel_held: reason present":     (r) => { try { return !!JSON.parse(r.body).reason; } catch { return false; } },
  });

  // Inventory should be freed — same dates can be held again
  const retryRes = createReservation(checkIn, checkOut, token);
  check(retryRes, { "cancel_held: room available after cancel": (r) => r.status === 201 });
  if (retryRes.status === 201) {
    submitReservation(JSON.parse(retryRes.body).id, token);
    confirmReservation(JSON.parse(retryRes.body).id, token);
  }
}

/**
 * 6 — Cancel from submitted
 * Creates a reservation, submits it (submitted), then cancels.
 * Verifies the reservation reaches the cancelled state.
 */
function cancelSubmitted(token) {
  const { checkIn, checkOut } = datePair();

  const resRes = createReservation(checkIn, checkOut, token);
  check(resRes, { "cancel_submitted: reservation 201": (r) => r.status === 201 });
  if (resRes.status !== 201) return;
  const { id } = JSON.parse(resRes.body);

  const submitRes = submitReservation(id, token);
  check(submitRes, { "cancel_submitted: submit 200": (r) => r.status === 200 });

  const cancelRes = cancelReservation(id, token);
  check(cancelRes, {
    "cancel_submitted: cancel 200":       (r) => r.status === 200,
    "cancel_submitted: status cancelled": (r) => { try { return JSON.parse(r.body).status === "cancelled"; } catch { return false; } },
  });
}

/**
 * 7 — Fail + rehold + retry to confirmed
 * Full retry path: held → submitted → failed → held (rehold) → submitted → confirmed.
 * Verifies the reservation recovers from a failed payment and reaches confirmed.
 */
function failAndRetry(token) {
  const { checkIn, checkOut } = datePair();

  const resRes = createReservation(checkIn, checkOut, token);
  check(resRes, { "fail_retry: reservation 201": (r) => r.status === 201 });
  if (resRes.status !== 201) return;
  const { id } = JSON.parse(resRes.body);

  // Transition to submitted
  const submitRes = submitReservation(id, token);
  check(submitRes, { "fail_retry: submit 200": (r) => r.status === 200 });
  if (submitRes.status !== 200) return;

  // Simulate Stripe payment_failed webhook response
  const failRes = failReservation(id, token);
  check(failRes, {
    "fail_retry: fail 200":        (r) => r.status === 200,
    "fail_retry: status failed":   (r) => { try { return JSON.parse(r.body).status === "failed"; } catch { return false; } },
    "fail_retry: reason present":  (r) => { try { return !!JSON.parse(r.body).reason; } catch { return false; } },
  });
  if (failRes.status !== 200) return;

  // Re-acquire inventory hold (failed → held)
  const reholdRes = reholdReservation(id, token);
  check(reholdRes, {
    "fail_retry: rehold 200":      (r) => r.status === 200,
    "fail_retry: status held":     (r) => { try { return JSON.parse(r.body).status === "held"; } catch { return false; } },
    "fail_retry: holdExpiresAt":   (r) => { try { return !!JSON.parse(r.body).holdExpiresAt; } catch { return false; } },
  });
  if (reholdRes.status !== 200) return;

  // Retry: submit → confirm
  const submitRes2 = submitReservation(id, token);
  check(submitRes2, { "fail_retry: 2nd submit 200": (r) => r.status === 200 });

  const confirmRes = confirmReservation(id, token);
  check(confirmRes, {
    "fail_retry: confirm 200":      (r) => r.status === 200,
    "fail_retry: status confirmed": (r) => { try { return JSON.parse(r.body).status === "confirmed"; } catch { return false; } },
  });
}

// ─── VU loop ─────────────────────────────────────────────────────────────────

const SCENARIOS = [
  happyPath,
  idempotency,
  getReservationScenario,
  submitAlreadyPending,
  fullLifecycle,
  cancelHeld,
  cancelSubmitted,
  failAndRetry,
];

export function setup() {
  // Single login at the start of the test; reused across all iterations.
  // Token TTL is 3600s (auth.types.ts) — well beyond a 5-minute smoke run.
  const token = login(GATEWAY_URL, E2E_EMAIL, E2E_PASSWORD);
  return { token };
}

export default function (data) {
  SCENARIOS[__ITER % SCENARIOS.length](data.token);
  jitter(300, 700); // 0.3–1s think time between iterations
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  return {
    "results/summary-booking.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
