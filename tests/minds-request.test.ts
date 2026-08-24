import { describe, expect, it } from "vitest";

import { canStartMindsRequest, createMindsRequestGate, ignorePromiseRejection } from "../lib/minds-request";

describe("canStartMindsRequest", () => {
  it("swallows rejected non-blocking promises", async () => {
    let failureCalled = false;
    ignorePromiseRejection(Promise.reject(new Error("quota refresh failed")), () => {
      failureCalled = true;
    });
    await Promise.resolve();
    expect(failureCalled).toBe(true);
  });

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
