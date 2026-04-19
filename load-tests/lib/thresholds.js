// Threshold definitions for search SLA validation.
// All values are in milliseconds. Test exits non-zero if any threshold is breached.
//
// Hard SLA from architecture docs: search-service p95 ≤ 800ms.
// Cached endpoints (featured, cities) get tighter thresholds since they hit Redis.

export const searchThresholds = {
  // Hard SLA — the primary gate for deployment validation
  "http_req_duration{scenario:search}": ["p(95)<800"],

  // Cached endpoints should be faster than a full DB search
  "http_req_duration{url_matches:/api/search/featured}": ["p(95)<300"],
  "http_req_duration{url_matches:/api/search/cities}":   ["p(95)<400"],

  // Error rate across all search requests
  "http_req_failed": ["rate<0.01"],
};
