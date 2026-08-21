import { describe, expect, it } from "vitest";

import { mindsDiscoveryInput } from "../server/minds-agent";

describe("Minds discovery input", () => {
  it("accepts a bounded archive request", () => {
    const result = mindsDiscoveryInput.safeParse({
      platforms: ["YouTube", "Instagram"],
      archiveTitle: "How to Edit Like a Pro",
      sourceYear: 2023,
      sourceViews: "12.4K",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty platform selections", () => {
    const result = mindsDiscoveryInput.safeParse({
      platforms: [],
      archiveTitle: "Dormant archive item",
      sourceYear: 2023,
      sourceViews: "12.4K",
    });

    expect(result.success).toBe(false);
  });

  it("rejects oversized archive titles before an LLM call", () => {
    const result = mindsDiscoveryInput.safeParse({
      platforms: ["TikTok"],
      archiveTitle: "x".repeat(121),
      sourceYear: 2023,
      sourceViews: "12.4K",
    });

    expect(result.success).toBe(false);
  });
});
