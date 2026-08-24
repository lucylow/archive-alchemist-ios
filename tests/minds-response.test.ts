import { describe, expect, it } from "vitest";

import {
  isValidMindsInsight,
  MINDS_RECOMMENDATIONS_MAX_COUNT,
  MINDS_SUMMARY_MAX_LENGTH,
} from "../lib/minds-response";
import type { MindsDiscoveryResponse } from "../shared/minds";

const insight: MindsDiscoveryResponse = {
  summary: "A concise archive strategy.",
  recommendations: [
    {
      title: "Reframe the opening",
      rationale: "Lead with the strongest archival moment.",
      formats: ["Short video", "Carousel"],
      confidence: 0.86,
    },
  ],
};

describe("bounded Minds insight validation", () => {
  it("accepts a server-shaped insight within bounds", () => {
    expect(isValidMindsInsight(insight)).toBe(true);
  });

  it("rejects an oversized summary", () => {
    expect(isValidMindsInsight({ ...insight, summary: "x".repeat(MINDS_SUMMARY_MAX_LENGTH + 1) })).toBe(false);
  });

  it("rejects too many recommendations", () => {
    const recommendations = Array.from({ length: MINDS_RECOMMENDATIONS_MAX_COUNT + 1 }, (_, index) => ({
      ...insight.recommendations[0],
      title: `Recommendation ${index}`,
    }));
    expect(isValidMindsInsight({ ...insight, recommendations })).toBe(false);
  });

  it("rejects too many formats and non-finite confidence", () => {
    const recommendation = insight.recommendations[0];
    expect(isValidMindsInsight({
      ...insight,
      recommendations: [{ ...recommendation, formats: ["a", "b", "c", "d", "e"] }],
    })).toBe(false);
    expect(isValidMindsInsight({
      ...insight,
      recommendations: [{ ...recommendation, confidence: Number.NaN }],
    })).toBe(false);
  });
});
