import { describe, expect, it } from "vitest";

import { normalizeCachedUser } from "../lib/_core/user-cache";

describe("cached user normalization", () => {
  it("converts serialized lastSignedIn values into Date instances", () => {
    const user = normalizeCachedUser({
      id: 7,
      openId: "user-7",
      name: "Creator",
      email: "creator@example.com",
      loginMethod: "manus",
      lastSignedIn: "2026-08-23T00:00:00.000Z",
    });

    expect(user?.lastSignedIn).toBeInstanceOf(Date);
    expect(user?.lastSignedIn.toISOString()).toBe("2026-08-23T00:00:00.000Z");
    expect(user?.role).toBe("user");
  });

  it("accepts an existing Date while normalizing optional fields", () => {
    const user = normalizeCachedUser({ id: 2, openId: "user-2", lastSignedIn: new Date("2026-01-01") });

    expect(user).toMatchObject({ id: 2, openId: "user-2", name: null, email: null, loginMethod: null });
    expect(user?.lastSignedIn).toBeInstanceOf(Date);
  });

  it("rejects malformed server-shaped web profiles before caching", () => {
    expect(
      normalizeCachedUser({
        id: "7",
        openId: "web-user",
        name: "Creator",
        email: "creator@example.com",
        loginMethod: "oauth",
        lastSignedIn: "not-a-date",
      }),
    ).toBeNull();
  });

  it("rejects malformed identity and invalid dates", () => {
    expect(normalizeCachedUser({ id: "2", openId: "user-2", lastSignedIn: Date.now() })).toBeNull();
    expect(normalizeCachedUser({ id: 2, openId: "", lastSignedIn: Date.now() })).toBeNull();
    expect(normalizeCachedUser({ id: 2, openId: "user-2", lastSignedIn: "not-a-date" })).toBeNull();
  });

  it("rejects oversized required identifiers and drops oversized optional metadata", () => {
    expect(normalizeCachedUser({ id: 2, openId: "x".repeat(257), lastSignedIn: Date.now() })).toBeNull();

    const user = normalizeCachedUser({
      id: 2,
      openId: "user-2",
      name: "x".repeat(201),
      email: "x".repeat(321),
      loginMethod: "x".repeat(65),
      lastSignedIn: Date.now(),
    });

    expect(user).toMatchObject({ name: null, email: null, loginMethod: null });
  });
});
