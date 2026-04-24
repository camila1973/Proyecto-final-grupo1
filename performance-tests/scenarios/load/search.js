/**
 * TravelHub — Search Load Test
 *
 * SLA validation under sustained traffic: ramp to 30 VUs over 2 min,
 * hold for 4 min, ramp down over 2 min. Gate: p95 ≤ 800ms.
 * All endpoints are public (no auth required).
 *
 * Usage:
 *   GATEWAY_URL=http://localhost:3000 k6 run scenarios/load/search.js
 *   npm run test:load:search
 */

import { check } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { Trend } from "k6/metrics";
import { searchThresholds } from "../../lib/thresholds.js";
import { get } from "../../lib/http.js";
import { randomItem, randomDatePair, jitter } from "../../lib/utils.js";
import { CITIES, CITY_PREFIXES, PROPERTY_IDS } from "../../fixtures/seed-data.js";

// ─── Custom metrics ───────────────────────────────────────────────────────────

const searchResultCount = new Trend("search_result_count", true);

// ─── Config ───────────────────────────────────────────────────────────────────

const GATEWAY_URL = __ENV.GATEWAY_URL;
if (!GATEWAY_URL) {
  throw new Error(
    "GATEWAY_URL env var is required. Example: GATEWAY_URL=http://localhost:3000 k6 run scenarios/load/search.js"
  );
}

// ─── Options ─────────────────────────────────────────────────────────────────

export const options = {
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
  thresholds: searchThresholds,
  tags: {
    environment: "production",
    project: "travelhub",
    profile: "load",
  },
  batchPerHost: 6,
};

// ─── Summary ─────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  return {
    "results/summary-search-load.html": htmlReport(data),
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

  jitter(500, 1500);
}
