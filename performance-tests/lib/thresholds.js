// Threshold definitions for search SLA validation.
// All values are in milliseconds. Test exits non-zero if any threshold is breached.
//
// Hard SLA from architecture docs: search-service p95 ≤ 800ms.
// Cached endpoints (featured, cities) get tighter thresholds since they hit Redis.

export const searchThresholds = {
  // Hard SLA — the primary gate for deployment validation
  "http_req_duration{scenario:search}": ["p(95)<800"],

  // Cached endpoints should be faster than a full DB search.
  // Filtered by the `name` tag set on each get() call in search.js.
  "http_req_duration{name:featured}":         ["p(95)<300"],
  "http_req_duration{name:city_autocomplete}": ["p(95)<400"],

  // Core search endpoints — enforce the hard 800ms SLA per endpoint.
  "http_req_duration{name:property_search}": ["p(95)<800"],
  "http_req_duration{name:room_detail}":     ["p(95)<800"],

  // A sustained average of 0 indicates a silent DB or index failure.
  "search_result_count": ["avg>0"],

  // Error rate across all search requests
  "http_req_failed": ["rate<0.01"],
};
