import { describe, expect, it } from "vitest";

import { getAuthStatusCopy } from "../lib/auth-ui";

describe("authentication status copy", () => {
  it("describes secure processing without exposing implementation details", () => {
    expect(getAuthStatusCopy("processing")).toEqual({
      title: "Completing authentication",
      body: "Securely connecting your creator workspace.",
      tone: "neutral",
    });
  });

  it("describes successful completion and redirect", () => {
    expect(getAuthStatusCopy("success")).toMatchObject({
      title: "Authentication successful",
      tone: "success",
    });
  });

  it("uses the specific error message when available and a safe fallback otherwise", () => {
    expect(getAuthStatusCopy("error", "The sign-in window could not be opened.").body).toBe(
      "The sign-in window could not be opened.",
    );
    expect(getAuthStatusCopy("error", null).body).toBe(
      "Please try again to reconnect your creator workspace.",
    );
  });
});
