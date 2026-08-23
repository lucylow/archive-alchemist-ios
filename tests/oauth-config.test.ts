import { describe, expect, it } from "vitest";

import { buildOAuthLoginUrl } from "../shared/oauth-config";

describe("OAuth login URL construction", () => {
  it("builds a URL with encoded app, redirect, state, and sign-in type", () => {
    const url = buildOAuthLoginUrl(
      "https://manus.im/",
      "archive-alchemist",
      "manusmobile://oauth/callback",
      "c3RhdGU=",
    );

    expect(url).toBe(
      "https://manus.im/app-auth?appId=archive-alchemist&redirectUri=manusmobile%3A%2F%2Foauth%2Fcallback&state=c3RhdGU%3D&type=signIn",
    );
  });

  it("returns null when required configuration is missing", () => {
    expect(buildOAuthLoginUrl("", "app", "redirect", "state")).toBeNull();
    expect(buildOAuthLoginUrl("https://manus.im", "", "redirect", "state")).toBeNull();
    expect(buildOAuthLoginUrl("https://manus.im", "app", "", "state")).toBeNull();
    expect(buildOAuthLoginUrl("https://manus.im", "app", "redirect", "")).toBeNull();
  });

  it("returns null for malformed portal URLs", () => {
    expect(buildOAuthLoginUrl("not a URL", "app", "redirect", "state")).toBeNull();
  });
});
