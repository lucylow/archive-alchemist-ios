import { describe, expect, it } from "vitest";

import {
  API_SECURITY_HEADERS,
  applyApiSecurityHeaders,
} from "../server/security-headers";

describe("API security headers", () => {
  it("defines conservative browser protections", () => {
    expect(API_SECURITY_HEADERS).toEqual({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
  });

  it("applies every header to an Express-compatible response", () => {
    const headers = new Map<string, string>();
    applyApiSecurityHeaders({
      set: (field, value) => headers.set(field, value),
    });

    expect(Object.fromEntries(headers)).toEqual(API_SECURITY_HEADERS);
  });
});
