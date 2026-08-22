import { describe, expect, it } from "vitest";

import { canStartMindsRequest, createMindsRequestGate } from "../lib/minds-request";

describe("canStartMindsRequest", () => {
  it("allows a request when no analysis is pending", () => {
    expect(canStartMindsRequest(false)).toBe(true);
  });

  it("blocks a duplicate request while analysis is pending", () => {
    expect(canStartMindsRequest(true)).toBe(false);
  });

  it("invalidates a cancelled request and accepts the next request", () => {
    const gate = createMindsRequestGate();
    const firstRequest = gate.begin();
    expect(gate.isCurrent(firstRequest)).toBe(true);
    gate.cancel();
    expect(gate.isCurrent(firstRequest)).toBe(false);
    const nextRequest = gate.begin();
    expect(gate.isCurrent(nextRequest)).toBe(true);
  });
});
