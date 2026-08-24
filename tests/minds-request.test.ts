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

  it("suppresses a delayed persistence commit after cancellation", async () => {
    const gate = createMindsRequestGate();
    const request = gate.begin();
    let committed = false;
    const delayedCommit = Promise.resolve().then(() => {
      if (gate.isCurrent(request)) committed = true;
    });
    gate.cancel();
    await delayedCommit;
    expect(committed).toBe(false);
  });

  it("keeps repeated cancellation invalidation-safe", () => {
    const gate = createMindsRequestGate();
    const request = gate.begin();
    gate.cancel();
    gate.cancel();
    expect(gate.isCurrent(request)).toBe(false);
    const replacementRequest = gate.begin();
    expect(gate.isCurrent(replacementRequest)).toBe(true);
    expect(gate.isCurrent(request)).toBe(false);
  });
});
