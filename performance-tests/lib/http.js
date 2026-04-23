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

// PATCH with optional JSON body, X-Load-Test header, and optional extra tags.
export function patch(url, body, tags = {}) {
  return http.patch(url, body != null ? JSON.stringify(body) : null, {
    headers: BASE_HEADERS,
    tags,
    timeout: "45s",
  });
}

// DELETE with X-Load-Test header and optional extra tags.
export function del(url, tags = {}) {
  return http.del(url, null, {
    headers: BASE_HEADERS,
    tags,
    timeout: "45s",
  });
}
