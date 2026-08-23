import { describe, expect, it } from "vitest";

import {
  isSafeOAuthUserPayload,
  MAX_OAUTH_USER_PARAM_LENGTH,
} from "../shared/oauth";

describe("OAuth profile payload bounds", () => {
  it("accepts a non-empty payload within the configured bound", () => {
    expect(isSafeOAuthUserPayload("eyJpZCI6MX0=")).toBe(true);
  });

  it("rejects missing and empty payloads", () => {
    expect(isSafeOAuthUserPayload(undefined)).toBe(false);
    expect(isSafeOAuthUserPayload("")).toBe(false);
  });

  it("rejects payloads larger than the configured bound", () => {
    expect(isSafeOAuthUserPayload("x".repeat(MAX_OAUTH_USER_PARAM_LENGTH + 1))).toBe(false);
  });
});
