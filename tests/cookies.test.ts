import { describe, expect, it } from "vitest";

import { getSessionCookieOptions } from "../server/_core/cookies";

describe("session cookie options", () => {
  it("uses secure SameSite=None cookies for HTTPS requests", () => {
    const options = getSessionCookieOptions({
      protocol: "https",
      hostname: "api.example.com",
      headers: {},
    } as never);

    expect(options).toMatchObject({
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });

  it("uses SameSite=Lax for local HTTP requests", () => {
    const options = getSessionCookieOptions({
      protocol: "http",
      hostname: "localhost",
      headers: {},
    } as never);

    expect(options).toMatchObject({
      secure: false,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    });
  });
});
