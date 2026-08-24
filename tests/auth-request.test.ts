import { describe, expect, it } from "vitest";

import { createAuthRequestGate } from "../lib/auth-request";

describe("authentication request gate", () => {
  it("keeps only the latest request current", () => {
    const gate = createAuthRequestGate();
    const first = gate.begin();
    const second = gate.begin();

    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(true);
  });

  it("invalidates a pending request when the session is cleared", () => {
    const gate = createAuthRequestGate();
    const request = gate.begin();

    gate.invalidate();

    expect(gate.isCurrent(request)).toBe(false);
  });

  it("allows a fresh request after invalidation", () => {
    const gate = createAuthRequestGate();
    const stale = gate.begin();
    gate.invalidate();
    const fresh = gate.begin();

    expect(gate.isCurrent(stale)).toBe(false);
    expect(gate.isCurrent(fresh)).toBe(true);
  });
});
