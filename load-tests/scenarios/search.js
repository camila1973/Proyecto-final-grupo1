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
 *   load  — ramp to 30 VUs over 2 min, hold 4 min, ramp down 2 min.
 */

import { check } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
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
          { duration: "2m", target: 30 },
          { duration: "4m", target: 30 },
          { duration: "2m", target: 0  },
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

// ─── Summary ─────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  return {
    "results/summary.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

// ─── VU loop ─────────────────────────────────────────────────────────────────

export default function () {
  const roll = Math.random();

  if (roll < 0.40) {
    const city = randomItem(CITIES);
    const { checkIn, checkOut } = randomDatePair();
    const guests = randomItem([1, 2]);

    const searchUrl =
      `${GATEWAY_URL}/api/search/properties` +
      `?city=${encodeURIComponent(city)}` +
      `&checkIn=${checkIn}` +
      `&checkOut=${checkOut}` +
      `&guests=${guests}`;

    const searchRes = get(searchUrl, { name: "property_search" });

    const searchOk = check(searchRes, {
      "property_search 200": (r) => r.status === 200,
      "property_search has results": (r) => {
        try { return Array.isArray(JSON.parse(r.body).results); } catch { return false; }
      },
    });

    if (searchOk && searchRes.status === 200) {
      let body;
      try { body = JSON.parse(searchRes.body); } catch { return; }

      searchResultCount.add(body.results ? body.results.length : 0);

      const propertyId =
        (body.results && body.results.length > 0)
          ? body.results[0].property.id
          : randomItem(PROPERTY_IDS);

      const roomsUrl =
        `${GATEWAY_URL}/api/search/properties/${propertyId}/rooms` +
        `?checkIn=${checkIn}` +
        `&checkOut=${checkOut}` +
        `&guests=${guests}`;

      const roomsRes = get(roomsUrl, { name: "room_detail" });

      check(roomsRes, {
        "room_detail 200": (r) => r.status === 200,
      });
    }
  } else if (roll < 0.80) {
    const q = randomItem(CITY_PREFIXES);
    const url = `${GATEWAY_URL}/api/search/cities?q=${encodeURIComponent(q)}`;
    const res = get(url, { name: "city_autocomplete" });

    check(res, {
      "city_autocomplete 200": (r) => r.status === 200,
      "city_autocomplete has suggestions": (r) => {
        try { return Array.isArray(JSON.parse(r.body).suggestions); } catch { return false; }
      },
    });
  } else {
    const url = `${GATEWAY_URL}/api/search/featured?limit=20`;
    const res = get(url, { name: "featured" });

    check(res, {
      "featured 200": (r) => r.status === 200,
      "featured has results": (r) => {
        try { return Array.isArray(JSON.parse(r.body).results); } catch { return false; }
      },
    });
  }

  // Think time: 0.5s–2s between iterations
  jitter(500, 1500);
}
