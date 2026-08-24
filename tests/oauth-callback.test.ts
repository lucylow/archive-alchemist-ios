import { describe, expect, it } from "vitest";

import { createOAuthCallbackGate } from "../lib/oauth-callback";

describe("OAuth callback lifecycle gate", () => {
  it("keeps only the latest callback current", () => {
    const gate = createOAuthCallbackGate();
    const first = gate.begin();
    const second = gate.begin();

    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(true);
  });

  it("invalidates a callback when the screen is cleaned up", () => {
    const gate = createOAuthCallbackGate();
    const callback = gate.begin();

    gate.invalidate();

    expect(gate.isCurrent(callback)).toBe(false);
  });

  it("allows a replacement callback after cleanup", () => {
    const gate = createOAuthCallbackGate();
    const stale = gate.begin();
    gate.invalidate();
    const replacement = gate.begin();

    expect(gate.isCurrent(stale)).toBe(false);
    expect(gate.isCurrent(replacement)).toBe(true);
  });
});
