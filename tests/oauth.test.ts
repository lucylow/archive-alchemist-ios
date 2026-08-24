import { describe, expect, it } from "vitest";

import {
  isSafeOAuthCode,
  isSafeOAuthSessionToken,
  isSafeOAuthState,
  isSafeOAuthUserPayload,
  MAX_OAUTH_CODE_LENGTH,
  MAX_OAUTH_SESSION_TOKEN_LENGTH,
  MAX_OAUTH_STATE_LENGTH,
  MAX_OAUTH_USER_PARAM_LENGTH,
} from "../shared/oauth";

describe("OAuth session-token bounds", () => {
  it("accepts a non-empty token within the configured bound", () => {
    expect(isSafeOAuthSessionToken("session-token")).toBe(true);
  });

  it("rejects missing, empty, and whitespace-padded tokens", () => {
    expect(isSafeOAuthSessionToken(undefined)).toBe(false);
    expect(isSafeOAuthSessionToken("")).toBe(false);
    expect(isSafeOAuthSessionToken(" session-token")).toBe(false);
    expect(isSafeOAuthSessionToken("session-token ")).toBe(false);
  });

  it("rejects tokens larger than the configured bound", () => {
    expect(isSafeOAuthSessionToken("x".repeat(MAX_OAUTH_SESSION_TOKEN_LENGTH + 1))).toBe(false);
  });
});

describe("OAuth authorization parameter bounds", () => {
  it("accepts valid code and state values", () => {
    expect(isSafeOAuthCode("authorization-code")).toBe(true);
    expect(isSafeOAuthState("state-value")).toBe(true);
  });

  it("rejects oversized or whitespace-padded code and state values", () => {
    expect(isSafeOAuthCode("x".repeat(MAX_OAUTH_CODE_LENGTH + 1))).toBe(false);
    expect(isSafeOAuthState("x".repeat(MAX_OAUTH_STATE_LENGTH + 1))).toBe(false);
    expect(isSafeOAuthCode(" authorization-code")).toBe(false);
    expect(isSafeOAuthState("state-value ")).toBe(false);
  });
});

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
