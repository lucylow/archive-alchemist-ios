import { describe, expect, it } from "vitest";

import { canStartMindsRequest } from "../lib/minds-request";

describe("canStartMindsRequest", () => {
  it("allows a request when no analysis is pending", () => {
    expect(canStartMindsRequest(false)).toBe(true);
  });

  it("blocks a duplicate request while analysis is pending", () => {
    expect(canStartMindsRequest(true)).toBe(false);
  });
});
