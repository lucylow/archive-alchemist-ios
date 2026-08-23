import { describe, expect, it } from "vitest";

import {
  MAX_API_ERROR_BODY_LENGTH,
  normalizeClientApiError,
} from "../shared/api-errors";

describe("client API error normalization", () => {
  it("uses a bounded JSON error message", () => {
    expect(normalizeClientApiError('{"error":"Request rejected"}', 400, "Bad Request")).toBe(
      "Request rejected",
    );
  });

  it("falls back to a status-based message for non-JSON bodies", () => {
    expect(normalizeClientApiError("private upstream details", 502, "Bad Gateway")).toBe(
      "API request failed (502 Bad Gateway).",
    );
  });

  it("does not return an oversized or raw body when JSON is truncated", () => {
    const message = "x".repeat(MAX_API_ERROR_BODY_LENGTH + 500);
    const normalized = normalizeClientApiError(JSON.stringify({ error: message }), 400, "");

    expect(normalized).toBe("API request failed (400).");
    expect(normalized.length).toBeLessThan(MAX_API_ERROR_BODY_LENGTH);
  });
});
