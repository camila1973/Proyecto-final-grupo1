import http from "k6/http";

const BASE_HEADERS = {
  "Content-Type": "application/json",
  "X-Load-Test": "true",
};

function buildHeaders(auth) {
  return auth
    ? { ...BASE_HEADERS, Authorization: `Bearer ${auth}` }
    : BASE_HEADERS;
}

// GET with automatic X-Load-Test header, optional Bearer auth, and optional extra tags.
export function get(url, tags = {}, auth = null) {
  return http.get(url, {
    headers: buildHeaders(auth),
    tags,
    timeout: "45s",
  });
}

// POST with JSON body, X-Load-Test header, optional Bearer auth, and optional extra tags.
export function post(url, body, tags = {}, auth = null) {
  return http.post(url, JSON.stringify(body), {
    headers: buildHeaders(auth),
    tags,
    timeout: "45s",
  });
}

// PATCH with optional JSON body, X-Load-Test header, optional Bearer auth, and optional extra tags.
export function patch(url, body, tags = {}, auth = null) {
  return http.patch(url, body != null ? JSON.stringify(body) : null, {
    headers: buildHeaders(auth),
    tags,
    timeout: "45s",
  });
}

// DELETE with X-Load-Test header, optional Bearer auth, and optional extra tags.
export function del(url, tags = {}, auth = null) {
  return http.del(url, null, {
    headers: buildHeaders(auth),
    tags,
    timeout: "45s",
  });
}
