import { describe, expect, it } from "vitest";

import { mergeMindsInsight, type PersistedMindMemory } from "../lib/mind-memory";

const memory: PersistedMindMemory = {
  title: "Archive lesson",
  platforms: ["YouTube"],
  savedAt: "2026-08-21T22:00:00.000Z",
  followUp: "Keep the follow-up alive.",
};

const insight = {
  summary: "Turn the lesson into a short-form series.",
  recommendations: [{
    title: "Three-part short",
    rationale: "The archive has a strong progression.",
    formats: ["Short video"],
    confidence: 0.88,
  }],
};

describe("mergeMindsInsight", () => {
  it("attaches the insight and keeps the updated workflow first", () => {
    const result = mergeMindsInsight(memory, [memory], insight);

    expect(result.memory.mindsInsight).toEqual(insight);
    expect(result.history).toHaveLength(1);
    expect(result.history[0]?.mindsInsight).toEqual(insight);
  });

  it("replaces the prior entry and keeps history bounded to five items", () => {
    const older = Array.from({ length: 5 }, (_, index) => ({
      ...memory,
      savedAt: `2026-08-${15 + index}T22:00:00.000Z`,
    }));
    const result = mergeMindsInsight(memory, [memory, ...older], insight);

    expect(result.history).toHaveLength(5);
    expect(result.history[0]?.savedAt).toBe(memory.savedAt);
    expect(result.history.filter((item) => item.savedAt === memory.savedAt)).toHaveLength(1);
  });
});
