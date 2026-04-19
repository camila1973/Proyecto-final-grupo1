/**
 * TravelHub — Search SLA Validation
 *
 * Validates the p95 ≤ 800ms requirement for the search-service via the API Gateway.
 * All endpoints are public (no auth required).
 *
 * Usage:
 *   TEST_PROFILE=smoke GATEWAY_URL=https://... k6 run scenarios/search.js
 *   TEST_PROFILE=load  GATEWAY_URL=https://... k6 run scenarios/search.js
 *
 * Profiles:
 *   smoke — 3 VUs for 2 min. Quick sanity check after deploy.
 *   load  — ramp to 30 VUs over 3 min, hold 9 min, ramp down 3 min.
 */

import { check } from "k6";
import { Trend } from "k6/metrics";
import { searchThresholds } from "../lib/thresholds.js";
import { get } from "../lib/http.js";
import { randomItem, randomDatePair, jitter } from "../lib/utils.js";
import { CITIES, CITY_PREFIXES, PROPERTY_IDS } from "../fixtures/seed-data.js";

// ─── Custom metrics ───────────────────────────────────────────────────────────

// Tracks the `total` count returned by property searches.
// A sustained 0 indicates a silent DB or availability issue even when HTTP 200.
const searchResultCount = new Trend("search_result_count", true);

// ─── Options ─────────────────────────────────────────────────────────────────

const PROFILES = {
  smoke: {
    scenarios: {
      search: {
        executor: "constant-vus",
        vus: 3,
        duration: "2m",
      },
    },
  },
  load: {
    scenarios: {
      search: {
        executor: "ramping-vus",
        startVUs: 0,
        stages: [
          { duration: "3m", target: 30 },
          { duration: "9m", target: 30 },
          { duration: "3m", target: 0  },
        ],
        gracefulRampDown: "30s",
      },
    },
  },
};

const profile = __ENV.TEST_PROFILE || "smoke";
if (!PROFILES[profile]) {
  throw new Error(`Unknown TEST_PROFILE "${profile}". Valid values: smoke, load`);
}

const GATEWAY_URL = __ENV.GATEWAY_URL;
if (!GATEWAY_URL) {
  throw new Error("GATEWAY_URL env var is required. Get it with: pulumi stack output gatewayUrl --stack prod --cwd pulumi");
}

export const options = {
  ...PROFILES[profile],
  thresholds: searchThresholds,
  tags: {
    environment: "production",
    project: "travelhub",
    profile,
  },
  // Reuse connections — Cloud Run supports HTTP/1.1 keep-alive
  batchPerHost: 6,
};

// ─── VU loop ─────────────────────────────────────────────────────────────────

export default function () {
  const roll = Math.random();

  if (roll < 0.40) {
    doPropertySearch();
  } else if (roll < 0.80) {
    doCityAutocomplete();
  } else {
    doFeatured();
  }

  // Think time: 0.5s–2s between iterations
  jitter(500, 1500);
}

// ─── Behaviors ───────────────────────────────────────────────────────────────

function doPropertySearch() {
  const city = randomItem(CITIES);
  const { checkIn, checkOut } = randomDatePair();
  const guests = randomItem([1, 2]);

  const searchUrl =
    `${GATEWAY_URL}/api/search/properties` +
    `?city=${encodeURIComponent(city)}` +
    `&checkIn=${checkIn}` +
    `&checkOut=${checkOut}` +
    `&guests=${guests}`;

  const searchRes = get(searchUrl, { endpoint: "property_search" });

  const searchOk = check(searchRes, {
    "property search: status 200": (r) => r.status === 200,
    "property search: has results array": (r) => {
      try { return Array.isArray(JSON.parse(r.body).results); } catch { return false; }
    },
  });

  if (searchOk && searchRes.status === 200) {
    let body;
    try { body = JSON.parse(searchRes.body); } catch { return; }

    searchResultCount.add(body.total ?? 0);

    // Follow up with a room detail request to simulate browsing behavior.
    // Pick a property from the response if available, otherwise use a seeded ID.
    const propertyId =
      (body.results && body.results.length > 0)
        ? body.results[0].propertyId
        : randomItem(PROPERTY_IDS);

    const roomsUrl =
      `${GATEWAY_URL}/api/search/properties/${propertyId}/rooms` +
      `?checkIn=${checkIn}` +
      `&checkOut=${checkOut}` +
      `&guests=${guests}`;

    const roomsRes = get(roomsUrl, { endpoint: "room_detail" });

    check(roomsRes, {
      "room detail: status 200 or 404": (r) => r.status === 200 || r.status === 404,
    });
  }
}

function doCityAutocomplete() {
  const q = randomItem(CITY_PREFIXES);
  const url = `${GATEWAY_URL}/api/search/cities?q=${encodeURIComponent(q)}`;
  const res = get(url, { endpoint: "city_autocomplete" });

  check(res, {
    "city autocomplete: status 200": (r) => r.status === 200,
    "city autocomplete: array response": (r) => {
      try { return Array.isArray(JSON.parse(r.body)); } catch { return false; }
    },
  });
}

function doFeatured() {
  const url = `${GATEWAY_URL}/api/search/featured?limit=20`;
  const res = get(url, { endpoint: "featured" });

  check(res, {
    "featured: status 200": (r) => r.status === 200,
    "featured: has results": (r) => {
      try { return Array.isArray(JSON.parse(r.body)); } catch { return false; }
    },
  });
}
