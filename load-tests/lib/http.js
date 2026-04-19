import http from "k6/http";

const BASE_HEADERS = {
  "Content-Type": "application/json",
  "X-Load-Test": "true",
};

// GET with automatic X-Load-Test header and optional extra tags.
export function get(url, tags = {}) {
  return http.get(url, {
    headers: BASE_HEADERS,
    tags,
    timeout: "45s",
  });
}

// POST with JSON body, X-Load-Test header, and optional extra tags.
export function post(url, body, tags = {}) {
  return http.post(url, JSON.stringify(body), {
    headers: BASE_HEADERS,
    tags,
    timeout: "45s",
  });
}
