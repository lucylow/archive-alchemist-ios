import { describe, expect, it } from "vitest";

import { mindsDiscoveryInput, parseMindsDiscoveryResponse, withTimeout } from "../server/minds-agent";

describe("Minds request timeout", () => {
  it("resolves before the timeout when the request completes", async () => {
    await expect(withTimeout(Promise.resolve("ready"), 20)).resolves.toBe("ready");
  });

  it("rejects with an explicit timeout error when the request is too slow", async () => {
    const slowRequest = new Promise<string>((resolve) => setTimeout(() => resolve("late"), 25));
    await expect(withTimeout(slowRequest, 5)).rejects.toThrow("Minds analysis timed out");
  });
});

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

  it("normalizes fenced JSON responses", () => {
    const payload = JSON.stringify({
      summary: "Reuse the lesson",
      recommendations: [{
        title: "Short lesson",
        rationale: "Clear hook",
        formats: ["Short"],
        confidence: 0.9,
      }],
    });
    const result = parseMindsDiscoveryResponse(`\`\`\`json\n${payload}\n\`\`\``);

    expect(result.recommendations[0]?.confidence).toBe(0.9);
  });

  it("rejects empty or schema-invalid model responses", () => {
    expect(() => parseMindsDiscoveryResponse("   ")).toThrow("empty response");
    expect(() => parseMindsDiscoveryResponse(JSON.stringify({ summary: "Missing recommendations" }))).toThrow();
  });
});
