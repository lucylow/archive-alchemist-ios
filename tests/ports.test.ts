import { describe, expect, it } from "vitest";

import { DEFAULT_API_PORT, parsePreferredPort } from "../server/ports";

describe("API startup port parsing", () => {
  it("accepts a valid numeric port", () => {
    expect(parsePreferredPort("3456")).toBe(3456);
  });

  it("falls back for missing or malformed values", () => {
    expect(parsePreferredPort(undefined)).toBe(DEFAULT_API_PORT);
    expect(parsePreferredPort("3000-dev")).toBe(DEFAULT_API_PORT);
    expect(parsePreferredPort("3.5")).toBe(DEFAULT_API_PORT);
  });

  it("falls back for out-of-range values", () => {
    expect(parsePreferredPort("0")).toBe(DEFAULT_API_PORT);
    expect(parsePreferredPort("65536")).toBe(DEFAULT_API_PORT);
  });
});
