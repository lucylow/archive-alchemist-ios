import { describe, expect, it } from "vitest";

import {
  markPrivateResponse,
  PRIVATE_RESPONSE_HEADERS,
} from "../server/private-response";

describe("private response headers", () => {
  it("defines cache-busting headers for session-bearing responses", () => {
    expect(PRIVATE_RESPONSE_HEADERS).toEqual({
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    });
  });

  it("applies both headers to an Express-compatible response", () => {
    const headers = new Map<string, string>();
    markPrivateResponse({
      set: (field, value) => headers.set(field, value),
    });

    expect(Object.fromEntries(headers)).toEqual(PRIVATE_RESPONSE_HEADERS);
  });
});
