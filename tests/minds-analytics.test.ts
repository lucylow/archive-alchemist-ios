import { describe, expect, it } from "vitest";

import { classifyMindsFailure, clampMindsDurationMs } from "../server/minds-analytics";

describe("Minds analytics helpers", () => {
  it("classifies failures without retaining their raw messages", () => {
    expect(classifyMindsFailure(new Error("Minds analysis timed out"))).toBe("TIMEOUT");
    expect(classifyMindsFailure("network request failed")).toBe("NETWORK");
    expect(classifyMindsFailure({ message: "invalid structured response" })).toBe("STRUCTURED_OUTPUT");
    expect(classifyMindsFailure({ code: "503" })).toBe("UPSTREAM");
  });

  it("clamps durations to safe non-negative integer database values", () => {
    expect(clampMindsDurationMs(-10)).toBe(0);
    expect(clampMindsDurationMs(12.8)).toBe(13);
    expect(clampMindsDurationMs(Number.MAX_SAFE_INTEGER)).toBe(2_147_483_647);
  });
});
