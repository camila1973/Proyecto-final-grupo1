type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "*";

export interface PublicRoute {
  method: Method;
  pattern: RegExp;
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  { method: "GET", pattern: /^\/api\/[^/]+\/health\/?$/ },

  { method: "POST", pattern: /^\/api\/auth\/register\/?$/ },
  { method: "POST", pattern: /^\/api\/auth\/login\/?$/ },
  { method: "POST", pattern: /^\/api\/auth\/login\/mfa\/?$/ },

  { method: "GET", pattern: /^\/api\/search(\/.*)?$/ },

  { method: "POST", pattern: /^\/api\/booking\/reservations\/?$/ },
  { method: "POST", pattern: /^\/api\/booking\/reservations\/preview\/?$/ },
  { method: "GET", pattern: /^\/api\/booking\/reservations\/[^/]+\/?$/ },
  {
    method: "PATCH",
    pattern: /^\/api\/booking\/reservations\/[^/]+\/guest-info\/?$/,
  },

  { method: "POST", pattern: /^\/api\/payment\/payments\/initiate\/?$/ },
  { method: "GET", pattern: /^\/api\/payment\/payments\/[^/]+\/status\/?$/ },
  { method: "POST", pattern: /^\/api\/payment\/payments\/webhook\/?$/ },

  {
    method: "POST",
    pattern: /^\/api\/integration\/webhooks\/[^/]+\/events\/?$/,
  },

  { method: "POST", pattern: /^\/api\/partners\/partners\/register\/?$/ },

  { method: "OPTIONS", pattern: /.*/ },
];

export function isPublicRoute(method: string, path: string): boolean {
  const upper = method.toUpperCase();
  return PUBLIC_ROUTES.some(
    (r) => (r.method === "*" || r.method === upper) && r.pattern.test(path),
  );
}
